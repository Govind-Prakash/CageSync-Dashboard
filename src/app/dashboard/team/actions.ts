'use server'

import { createClient } from '@/lib/supabase/server'
import { sendInviteEmail as sharedSendInviteEmail } from '@/lib/invites/send-email'

// Thin wrapper preserving the existing server-action signature for the
// dashboard invite modal. Real work lives in `@/lib/invites/send-email`
// so the Flutter-facing API route can share it.
//
// `email` in params is unused today (the shared function re-fetches from
// the invite row) but kept in the signature so the modal doesn't need
// to change.
export async function sendInviteEmail(params: {
  token: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  return sharedSendInviteEmail(supabase, params.token)
}
