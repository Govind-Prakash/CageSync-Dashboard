import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'

// Shared invite-email logic used by both the dashboard server action
// (cookie-authed) and the Flutter-facing API route (JWT-authed). Caller
// is responsible for producing an authenticated Supabase client — this
// function only enforces auth via `getUser()` on that client.
//
// Resend `from` is currently the default sandbox address
// (`onboarding@resend.dev`), which can ONLY deliver to the email
// associated with the Resend account until cagesync.com is verified
// in Resend. Once verified, change the from address to
// `invites@cagesync.com` (see roadmap VIII-3).
export async function sendInviteEmail(
  supabase: SupabaseClient,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'not_signed_in' }

    // Re-fetch the invite from the DB — never trust the caller's copy of
    // the payload that ends up in the email.
    const { data: invite, error: inviteErr } = await supabase
      .from('lab_invites')
      .select('email, role, lab_id, token, expires_at')
      .eq('token', token)
      .maybeSingle()
    if (inviteErr) return { success: false, error: inviteErr.message }
    if (!invite) return { success: false, error: 'invite_not_found' }

    const [{ data: lab }, { data: inviterProfile }] = await Promise.all([
      supabase.from('labs').select('name').eq('id', invite.lab_id).maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle(),
    ])

    const labName = lab?.name ?? 'a CageSync lab'
    const inviterName =
      inviterProfile?.full_name ||
      inviterProfile?.email?.split('@')[0] ||
      'A lab admin'
    const rolePretty = prettifyRole(invite.role as string)
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const acceptUrl = `${baseUrl}/invite/accept?token=${encodeURIComponent(
      invite.token as string,
    )}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: sendErr } = await resend.emails.send({
      from: 'CageSync <onboarding@resend.dev>',
      to: invite.email,
      subject: `You're invited to join ${labName} on CageSync`,
      html: buildHtml({ labName, inviterName, rolePretty, acceptUrl }),
      text: buildText({ labName, inviterName, rolePretty, acceptUrl }),
    })

    if (sendErr) return { success: false, error: sendErr.message }
    return { success: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return { success: false, error: msg }
  }
}

// ---------------------------------------------------------------------------

function prettifyRole(role: string): string {
  switch (role) {
    case 'pi':
      return 'PI'
    case 'researcher':
      return 'Researcher'
    case 'technician':
      return 'Technician'
    case 'observer':
      return 'Observer'
    case 'lab_manager':
      return 'Lab Manager'
    case 'facility_vet':
      return 'Facility Vet'
    case 'facility_manager':
      return 'Facility Manager'
    default:
      return role
  }
}

function buildHtml(p: {
  labName: string
  inviterName: string
  rolePretty: string
  acceptUrl: string
}): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F4F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1A1A2E;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F7F5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;">
          <tr>
            <td style="padding:32px;">
              <div style="font-size:11px;letter-spacing:1.6px;font-weight:700;color:#1A7F64;text-transform:uppercase;font-family:'SFMono-Regular',Menlo,Consolas,monospace;margin-bottom:12px;">You're invited</div>
              <h1 style="font-size:22px;line-height:1.25;margin:0 0 8px 0;color:#1A1A2E;font-weight:700;">Join ${escapeHtml(p.labName)} on CageSync</h1>
              <p style="color:#6B7280;font-size:14px;line-height:1.55;margin:0 0 20px 0;">${escapeHtml(p.inviterName)} invited you to join their lab as a <strong style="color:#1A1A2E;">${escapeHtml(p.rolePretty)}</strong>. CageSync helps research labs manage colonies, breeding, and animal welfare.</p>
              <a href="${p.acceptUrl}" style="display:inline-block;background:#1A7F64;color:#FFFFFF;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">Accept invitation</a>
              <p style="color:#9AA7A1;font-size:12px;line-height:1.6;margin:24px 0 0 0;">Or copy this link into your browser:<br><a href="${p.acceptUrl}" style="color:#1A7F64;word-break:break-all;">${p.acceptUrl}</a></p>
              <p style="color:#9AA7A1;font-size:12px;margin:16px 0 0 0;">This invitation expires in 7 days.</p>
            </td>
          </tr>
        </table>
        <p style="color:#9AA7A1;font-size:11px;margin:16px 0 0 0;">CageSync · cagesync.com</p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildText(p: {
  labName: string
  inviterName: string
  rolePretty: string
  acceptUrl: string
}): string {
  return `You're invited to join ${p.labName} on CageSync.

${p.inviterName} invited you to join their lab as a ${p.rolePretty}.

Accept your invitation: ${p.acceptUrl}

This link expires in 7 days.

— CageSync`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
