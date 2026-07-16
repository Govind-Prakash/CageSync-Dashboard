import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInviteEmail } from '@/lib/invites/send-email'

// POST /api/invites/send-email
//
// Flutter (and any other non-cookie caller) posts { token } here after
// inserting a lab_invites row. Auth is a Supabase JWT in the
// Authorization: Bearer header. RLS on lab_invites (`_select_pi`)
// enforces that only PI / lab_manager of the invite's lab can trigger
// the send — see supabase/migrations/0010_multilab_rls_cutover.sql.
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return NextResponse.json(
      { ok: false, error: 'missing_bearer_token' },
      { status: 401 },
    )
  }
  const jwt = match[1]

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    )
  }

  const token =
    body && typeof body === 'object' && 'token' in body
      ? (body as { token: unknown }).token
      : null
  if (typeof token !== 'string' || token.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'missing_token' },
      { status: 400 },
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )

  const result = await sendInviteEmail(supabase, token)
  if (!result.success) {
    // Distinguish auth failures from downstream errors so the client can
    // decide whether to retry vs surface a permission message.
    const status =
      result.error === 'not_signed_in'
        ? 401
        : result.error === 'invite_not_found'
          ? 404
          : 502
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }
  return NextResponse.json({ ok: true })
}
