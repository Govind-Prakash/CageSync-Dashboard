-- 0024_cage_transfer.sql
-- Workstream I-4: enable moving a cage (and everything scoped
-- underneath it) from one lab to another. Primary use case: a
-- student who leaves a lab wants to move their colony rows into
-- their new PI's lab. Requires the caller to be a writer of BOTH
-- labs (the source AND the target) — this is the "mutual access"
-- guarantee that prevents someone from ripping a cage out of a
-- lab they don't belong to.
--
-- Ships:
--   * public.cage_transfers audit table
--   * public.transfer_cage(p_cage_id uuid, p_to_lab_id uuid,
--                          p_notes text default null) SECURITY DEFINER RPC
--
-- Idempotent (safe to re-run).

-- ============================================================
-- 1. Audit table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cage_transfers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cage_id          uuid NOT NULL REFERENCES public.cages(id) ON DELETE SET NULL,
  from_lab_id      uuid NOT NULL REFERENCES public.labs(id)  ON DELETE SET NULL,
  to_lab_id        uuid NOT NULL REFERENCES public.labs(id)  ON DELETE SET NULL,
  transferred_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  transferred_at   timestamptz NOT NULL DEFAULT now(),
  notes            text
);

CREATE INDEX IF NOT EXISTS cage_transfers_cage_id_idx
  ON public.cage_transfers (cage_id);
CREATE INDEX IF NOT EXISTS cage_transfers_from_idx
  ON public.cage_transfers (from_lab_id, transferred_at DESC);
CREATE INDEX IF NOT EXISTS cage_transfers_to_idx
  ON public.cage_transfers (to_lab_id, transferred_at DESC);

ALTER TABLE public.cage_transfers ENABLE ROW LEVEL SECURITY;

-- Read: anyone who is a writer of either the source OR the target
-- lab can see the row. Both parties should know about the transfer.
DROP POLICY IF EXISTS "cage_transfers_read_involved" ON public.cage_transfers;
CREATE POLICY "cage_transfers_read_involved" ON public.cage_transfers
  FOR SELECT
  TO authenticated
  USING (
    public.can_read_lab(from_lab_id)
    OR public.can_read_lab(to_lab_id)
  );

-- No direct INSERT/UPDATE/DELETE — all writes go through the RPC.
GRANT SELECT ON public.cage_transfers TO authenticated;

-- ============================================================
-- 2. The RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.transfer_cage(
  p_cage_id    uuid,
  p_to_lab_id  uuid,
  p_notes      text DEFAULT NULL
)
RETURNS uuid   -- returns cage_transfers.id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_lab_id uuid;
  v_transfer_id uuid;
BEGIN
  -- 1. Existence + source lab lookup.
  SELECT lab_id INTO v_from_lab_id
    FROM public.cages
   WHERE id = p_cage_id;

  IF v_from_lab_id IS NULL THEN
    RAISE EXCEPTION 'Cage not found: %', p_cage_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_from_lab_id = p_to_lab_id THEN
    RAISE EXCEPTION 'Cage % is already in lab %', p_cage_id, p_to_lab_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 2. Authorization: caller must be a WRITER of both labs. This is
  --    the mutual-access guarantee. can_write_lab covers PI /
  --    lab_manager / researcher / technician per the ladder in 0007.
  IF NOT public.can_write_lab(v_from_lab_id) THEN
    RAISE EXCEPTION 'Not authorized to transfer from lab %', v_from_lab_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT public.can_write_lab(p_to_lab_id) THEN
    RAISE EXCEPTION 'Not authorized to transfer into lab %', p_to_lab_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Cascade the lab_id update to every child scoped by cage or
  --    animals under the cage. Order matters only for readability;
  --    all these tables have their own RLS but SECURITY DEFINER
  --    bypasses so we can atomically re-parent the whole tree.
  UPDATE public.cages
     SET lab_id = p_to_lab_id, updated_at = now()
   WHERE id = p_cage_id;

  UPDATE public.animals
     SET lab_id = p_to_lab_id, updated_at = now()
   WHERE cage_id = p_cage_id;

  UPDATE public.litters
     SET lab_id = p_to_lab_id, updated_at = now()
   WHERE cage_id = p_cage_id;

  -- treatments join through animals — a treatment doesn't carry
  -- cage_id, so we scope by "animal is in this cage".
  UPDATE public.treatments t
     SET lab_id = p_to_lab_id, updated_at = now()
   WHERE t.animal_id IN (
     SELECT id FROM public.animals WHERE cage_id = p_cage_id
   );

  -- observations table isn't present on every environment yet;
  -- guard so this RPC doesn't hard-fail on projects that predate it.
  BEGIN
    UPDATE public.observations o
       SET lab_id = p_to_lab_id
     WHERE o.animal_id IN (
       SELECT id FROM public.animals WHERE cage_id = p_cage_id
     );
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;

  -- cage_flags carry a denormalized lab_id; keep in sync so RLS
  -- still resolves for the new lab's members.
  UPDATE public.cage_flags
     SET lab_id = p_to_lab_id
   WHERE cage_id = p_cage_id;

  -- 4. Audit row.
  INSERT INTO public.cage_transfers (cage_id, from_lab_id, to_lab_id, notes)
  VALUES (p_cage_id, v_from_lab_id, p_to_lab_id, p_notes)
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_cage(uuid, uuid, text)
  TO authenticated;

-- Notify Realtime so both the sending and receiving lab's clients
-- see the child rows repoint immediately (cages/animals/etc. are
-- already in the publication).
