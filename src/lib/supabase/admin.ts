import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client for server-side use ONLY. Bypasses RLS.
 *
 * Never import this into a client component or send its output to the
 * browser. Reserved for API routes / server actions that need to
 * write on the caller's behalf but bypass RLS for a specific reason
 * (e.g. writing to deny-all tables like email_verification_codes).
 *
 * Reads its key from SUPABASE_SECRET_KEY (the service_role key).
 */
export function createServerAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY',
    )
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
