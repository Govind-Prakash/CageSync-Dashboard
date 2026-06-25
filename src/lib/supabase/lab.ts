import type { SupabaseClient } from '@supabase/supabase-js'

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
