import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import crypto from 'node:crypto'

/**
 * POST /api/institutions/send-verification
 *
 * Body: { institutionId: string, email: string }
 *
 * Generates a 6-digit code, hashes it (sha256, matching the
 * hash_verification_code() Postgres function shipped in 0029),
 * inserts a row into email_verification_codes, and emails the raw
 * code to the requested address via Resend.
 *
 * Guards:
 *   - Caller must be signed in.
 *   - `email`'s domain must appear in the target institution's
 *     `email_domains` array — no arbitrary "send me a code at any
 *     address" endpoint that could be used as an SMTP relay.
 *
 * The client never sees the code. Verification happens via the
 * companion RPC `verify_institution_code`.
 */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY not configured' },
        { status: 500 },
      )
    }

    const body = (await req.json()) as {
      institutionId?: string
      email?: string
    }
    const institutionId = body.institutionId?.trim()
    const email = body.email?.trim().toLowerCase()

    if (!institutionId || !email) {
      return NextResponse.json(
        { success: false, error: 'missing_params' },
        { status: 400 },
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'invalid_email' },
        { status: 400 },
      )
    }

    // Auth: the user session (cookie-based). email_verification_codes
    // is keyed on the caller's user_id.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'not_signed_in' },
        { status: 401 },
      )
    }

    // Institution lookup — read via service role so RLS on
    // institutions doesn't affect us (institutions RLS is
    // active-only SELECT, which is fine, but service role sidesteps
    // any future tightening).
    const admin = createServerAdminClient()
    const { data: institution, error: instErr } = await admin
      .from('institutions')
      .select('id, common_name, email_domains, status')
      .eq('id', institutionId)
      .maybeSingle()

    if (instErr) {
      return NextResponse.json(
        { success: false, error: instErr.message },
        { status: 500 },
      )
    }
    if (!institution || institution.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'institution_not_active' },
        { status: 400 },
      )
    }

    const domain = email.split('@')[1] ?? ''
    if (!(institution.email_domains as string[]).includes(domain)) {
      return NextResponse.json(
        {
          success: false,
          error: 'domain_mismatch',
          expected: institution.email_domains,
        },
        { status: 400 },
      )
    }

    // Generate a 6-digit numeric code (000000-999999).
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')

    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString()

    // Insert as service role so RLS on email_verification_codes
    // (which is deny-all for direct writes) doesn't block us.
    const { error: insErr } = await admin
      .from('email_verification_codes')
      .insert({
        user_id: user.id,
        institution_id: institutionId,
        email,
        code_hash: codeHash,
        expires_at: expiresAt,
      })

    if (insErr) {
      return NextResponse.json(
        { success: false, error: insErr.message },
        { status: 500 },
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendErr } = await resend.emails.send({
      from: 'CageSync <invites@cagesync.com>',
      to: email,
      subject: `Your CageSync institution verification code: ${code}`,
      html: buildHtml({ code, institutionName: institution.common_name }),
      text: buildText({ code, institutionName: institution.common_name }),
    })

    if (sendErr) {
      return NextResponse.json(
        { success: false, error: sendErr.message ?? 'email_failed' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, expires_at: expiresAt })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

function buildHtml({ code, institutionName }: { code: string; institutionName: string }) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1A1A2E; margin: 0 0 8px;">Verify your ${escapeHtml(institutionName)} affiliation</h2>
      <p style="color: #6B7280; margin: 0 0 20px;">Enter this code in CageSync to confirm you're at ${escapeHtml(institutionName)}. The code expires in 15 minutes.</p>
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 32px; letter-spacing: 8px; color: #1A7F64; text-align: center; padding: 20px; background: #E8F5F1; border-radius: 12px; margin-bottom: 20px;">${code}</div>
      <p style="color: #9CA3AF; font-size: 12px;">If you didn't request this code, you can ignore this email.</p>
    </div>
  `
}

function buildText({ code, institutionName }: { code: string; institutionName: string }) {
  return [
    `Verify your ${institutionName} affiliation in CageSync.`,
    ``,
    `Your code: ${code}`,
    ``,
    `The code expires in 15 minutes.`,
    ``,
    `If you didn't request this, ignore this email.`,
  ].join('\n')
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
