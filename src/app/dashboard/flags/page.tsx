import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveLabId } from '@/lib/supabase/lab'
import FlagsList from './flags-list'

/// Dashboard "Flags" inbox. Server component that fetches the
/// initial slice of cage_flags for the active lab (joined with the
/// cage label + code and the flag_types reference row so the client
/// doesn't need extra round-trips to render). Client component
/// handles realtime updates, resolve actions, and signed-URL
/// photo loading.
export default async function FlagsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const labId = await getActiveLabId(supabase)

  // Flags for the active lab. Join cages so we can show cage
  // label/code; join flag_types so we can show the human label +
  // icon slug. Both joins use PostgREST's `!inner` semantics so
  // orphan rows (which shouldn't exist) never show up.
  const { data: rawFlags } = labId
    ? await supabase
        .from('cage_flags')
        .select(`
          *,
          cage:cages!inner (id, label, cage_code, cage_type),
          type:flag_types!inner (id, label, icon)
        `)
        .eq('lab_id', labId)
        .order('resolved', { ascending: true })      // unresolved first
        .order('created_at', { ascending: false })   // newest first
    : { data: [] as any[] }

  // Attachments in a second query (avoids nested subselect gotchas).
  const flagIds = (rawFlags ?? []).map((f: any) => f.id)
  const { data: rawAttachments } = flagIds.length > 0
    ? await supabase
        .from('cage_flag_attachments')
        .select('id, flag_id, file_path, content_type')
        .in('flag_id', flagIds)
    : { data: [] as any[] }

  // Group attachments by flag_id for O(1) lookup on the client.
  const attachmentsByFlag: Record<string, Array<{ id: string; file_path: string }>> = {}
  for (const a of rawAttachments ?? []) {
    ;(attachmentsByFlag[a.flag_id] ??= []).push({ id: a.id, file_path: a.file_path })
  }

  return (
    <div className="pt-2">
      <FlagsList
        initialFlags={rawFlags ?? []}
        attachmentsByFlag={attachmentsByFlag}
        labId={labId}
      />
    </div>
  )
}
