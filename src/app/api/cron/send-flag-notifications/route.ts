import { NextRequest, NextResponse } from 'next/server'
import { createServerAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

/**
 * GET /api/cron/send-flag-notifications
 *
 * Vercel Cron worker. Called every minute per vercel.json cron
 * config. Reads unsent flag_notifications rows, hydrates each with
 * flag + cage + recipient details, sends an email via Resend, and
 * marks the row sent_at = now(). On error, increments attempts + logs
 * so a bad row eventually stops retrying (partial index in the
 * migration filters on `attempts < 5`).
 *
 * Auth: Vercel Cron injects `Authorization: Bearer $CRON_SECRET`
 * on the request. Reject anything else so this endpoint isn't
 * abusable from the public internet.
 *
 * Rate limit: process at most BATCH_SIZE per tick to keep the
 * function well under Vercel's serverless timeout budget.
 */

const BATCH_SIZE = 10

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 },
    )
  }

  const admin = createServerAdminClient()

  // Grab the oldest unsent, unexhausted rows. Sequential timestamp
  // order so a customer who's been down 20 min gets caught up in
  // insertion order.
  const { data: pending, error: fetchErr } = await admin
    .from('flag_notifications')
    .select('id, flag_id, recipient_user_id, attempts')
    .is('sent_at', null)
    .lt('attempts', 5)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let sent = 0
  let failed = 0

  for (const n of pending) {
    // Hydrate everything needed for the email body. The flagger's
    // profile is fetched separately because cage_flags.flagged_by
    // references auth.users (no direct FK to profiles), so a
    // PostgREST embed join isn't available for that column.
    const [{ data: flag }, { data: recipient }] = await Promise.all([
      admin
        .from('cage_flags')
        .select(`
          id, notes, severity, created_at, flagged_by,
          cage:cages!inner (label, cage_code),
          type:flag_types!inner (label)
        `)
        .eq('id', n.flag_id)
        .maybeSingle(),
      admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', n.recipient_user_id)
        .maybeSingle(),
    ])
    const { data: flagger } = flag?.flagged_by
      ? await admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', flag.flagged_by)
          .maybeSingle()
      : { data: null }

    if (!flag || !recipient?.email) {
      await admin
        .from('flag_notifications')
        .update({
          attempts: n.attempts + 1,
          error: !flag ? 'flag_not_found' : 'recipient_email_missing',
        })
        .eq('id', n.id)
      failed++
      continue
    }

    const cage = normalizeEmbed(flag.cage) as { label: string; cage_code: string }
    const flagType = normalizeEmbed(flag.type) as { label: string }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.cagesync.com'
    const flagsUrl = `${baseUrl}/dashboard/flags`

    try {
      const { error: sendErr } = await resend.emails.send({
        from: 'CageSync Alerts <invites@cagesync.com>',
        to: recipient.email,
        subject: `🚨 URGENT: ${flagType.label} on cage ${cage.label || cage.cage_code}`,
        html: buildHtml({
          recipientName: recipient.full_name || 'there',
          cageLabel: cage.label || cage.cage_code,
          cageCode: cage.cage_code,
          flagLabel: flagType.label,
          notes: flag.notes,
          flaggerName:
            flagger?.full_name || flagger?.email?.split('@')[0] || 'facility staff',
          flagsUrl,
        }),
        text: buildText({
          recipientName: recipient.full_name || 'there',
          cageLabel: cage.label || cage.cage_code,
          flagLabel: flagType.label,
          notes: flag.notes,
          flaggerName:
            flagger?.full_name || flagger?.email?.split('@')[0] || 'facility staff',
          flagsUrl,
        }),
      })

      if (sendErr) {
        await admin
          .from('flag_notifications')
          .update({
            attempts: n.attempts + 1,
            error: sendErr.message ?? 'send_failed',
          })
          .eq('id', n.id)
        failed++
      } else {
        await admin
          .from('flag_notifications')
          .update({ sent_at: new Date().toISOString(), error: null })
          .eq('id', n.id)
        sent++
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await admin
        .from('flag_notifications')
        .update({ attempts: n.attempts + 1, error: message })
        .eq('id', n.id)
      failed++
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed })
}

function normalizeEmbed(v: unknown) {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

interface Ctx {
  recipientName: string
  cageLabel: string
  cageCode?: string
  flagLabel: string
  notes: string | null
  flaggerName: string
  flagsUrl: string
}

function buildHtml(c: Ctx) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <div style="background: #FCEBEB; border-left: 4px solid #E53E3E; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 1px; color: #A32D2D; font-weight: 700;">URGENT · CAGE FLAG</div>
      </div>
      <h2 style="color: #1A1A2E; margin: 0 0 8px; font-size: 20px;">Hi ${escapeHtml(c.recipientName)},</h2>
      <p style="color: #374151; margin: 0 0 12px; line-height: 1.5;">
        ${escapeHtml(c.flaggerName)} has flagged <strong>${escapeHtml(c.cageLabel)}</strong> with an urgent <strong>${escapeHtml(c.flagLabel)}</strong> alert.
      </p>
      ${c.notes ? `<div style="background: #F8FAFB; border-radius: 8px; padding: 14px; margin: 16px 0; color: #374151; font-style: italic;">"${escapeHtml(c.notes)}"</div>` : ''}
      <a href="${c.flagsUrl}" style="display: inline-block; background: #1A7F64; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; margin-top: 8px;">Open flags in CageSync →</a>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">You're receiving this because you're the PI or lab manager of a lab that was just flagged. Manage notifications in your CageSync settings.</p>
    </div>
  `
}

function buildText(c: Ctx) {
  return [
    `URGENT — cage flag`,
    ``,
    `Hi ${c.recipientName},`,
    ``,
    `${c.flaggerName} has flagged "${c.cageLabel}" with an urgent "${c.flagLabel}" alert.`,
    c.notes ? `\nNotes: "${c.notes}"\n` : ``,
    `Open flags: ${c.flagsUrl}`,
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
