import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns the caller's active lab_id, or null if signed out / no lab set.
 * Prefer this over `getMyLabId` for pages that should gracefully render
 * an empty state instead of throwing (e.g. entity list pages, since a
 * multi-lab user could theoretically be in a state where their active
 * lab was just deleted).
 */
export async function getActiveLabId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('lab_id')
    .eq('id', user.id)
    .maybeSingle()

  return (data?.lab_id as string | undefined) ?? null
}

export async function getMyLabId(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('profiles')
    .select('lab_id')
    .eq('id', user.id)
    .single()

  if (error) throw error
  if (!data?.lab_id) throw new Error('No lab assigned to your profile')
  return data.lab_id as string
}

export interface LabMembership {
  lab_id: string
  role: string
  lab_name: string
}

/**
 * Fetches every lab the current user is a member of, joined with the lab
 * name. Ordered alphabetically. Powers the header lab switcher.
 * Returns [] if not signed in or no memberships (new users pre-onboarding).
 */
export async function getMyLabMemberships(
  supabase: SupabaseClient
): Promise<LabMembership[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('lab_memberships')
    .select('lab_id, role, labs!inner(name)')
    .eq('user_id', user.id)
    .order('labs(name)', { ascending: true })

  if (error) {
    // Swallow — switcher can render a single-lab fallback if this fails.
    // eslint-disable-next-line no-console
    console.error('getMyLabMemberships failed:', error)
    return []
  }

  return (data ?? []).map((row) => {
    const labs = row.labs as unknown as { name: string } | { name: string }[]
    // Supabase typing sometimes returns the joined row as an array
    const lab = Array.isArray(labs) ? labs[0] : labs
    return {
      lab_id: row.lab_id as string,
      role: row.role as string,
      lab_name: lab?.name ?? '(unnamed lab)',
    }
  })
}
