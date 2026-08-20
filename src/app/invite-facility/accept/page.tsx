import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AcceptFacilityButton from './AcceptFacilityButton'

/**
 * /invite-facility/accept?token=<uuid>
 *
 * Server component that resolves a facility invite token via
 * `get_pending_facility_invite` (0025 III-1) and renders one of
 * four states — same shape as /invite/accept for lab invites.
 */
export default async function FacilityInviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <InvalidState
        title="No invitation token"
        message="This page expects an `?token=...` query parameter. The link you opened may have been truncated — ask the facility manager to send a new invite."
      />
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: invite, error: rpcError } = await supabase.rpc(
    'get_pending_facility_invite',
    { p_token: token },
  )

  if (rpcError || !invite || !invite.id) {
    return (
      <InvalidState
        title="This invitation is no longer valid"
        message="Facility links expire 7 days after they're sent and can only be used once. Ask the facility manager to send a new one."
      />
    )
  }

  const { data: facility } = await supabase
    .from('facilities')
    .select('name, institution')
    .eq('id', invite.facility_id)
    .maybeSingle()
  const facilityName = facility?.name ?? 'a CageSync facility'
  const facilityInst = facility?.institution ?? null

  const { data: inviter } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', invite.invited_by)
    .maybeSingle()
  const inviterName =
    inviter?.full_name || inviter?.email?.split('@')[0] || 'A facility manager'

  const prettyRole = prettifyRole(invite.role as string)

  // Signed out
  if (!user) {
    const next = `/invite-facility/accept?token=${encodeURIComponent(token)}`
    const loginHref = `/login?next=${encodeURIComponent(next)}`
    return (
      <Shell>
        <Card>
          <Eyebrow>You're invited</Eyebrow>
          <H1>Join <strong>{facilityName}</strong></H1>
          {facilityInst && <Sub>{facilityInst}</Sub>}
          <Detail>
            <Row label="Invited as"    value={prettyRole} />
            <Row label="From"          value={inviterName} />
            <Row label="For email"     value={invite.email} mono />
          </Detail>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            Sign in (or create an account) to accept this facility invitation.
          </p>
          <PrimaryLink href={loginHref}>Sign in to accept</PrimaryLink>
        </Card>
      </Shell>
    )
  }

  // Wrong account
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell>
        <Card>
          <Eyebrow danger>Wrong account</Eyebrow>
          <H1>This invite is for a different email</H1>
          <Detail>
            <Row label="You're signed in as" value={user.email ?? '—'} mono />
            <Row label="Invite was sent to"  value={invite.email} mono />
          </Detail>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            Sign out and sign back in with{' '}
            <span style={{ fontFamily: 'monospace' }}>{invite.email}</span>,
            or ask the facility manager to re-send the invite to your
            current address.
          </p>
          <PrimaryLink href="/dashboard">Back to dashboard</PrimaryLink>
        </Card>
      </Shell>
    )
  }

  // Ready to accept
  return (
    <Shell>
      <Card>
        <Eyebrow>You're invited</Eyebrow>
        <H1>Join <strong>{facilityName}</strong></H1>
        {facilityInst && <Sub>{facilityInst}</Sub>}
        <Detail>
          <Row label="Joining as" value={prettyRole} />
          <Row label="Invited by" value={inviterName} />
        </Detail>
        <AcceptFacilityButton token={token} />
      </Card>
    </Shell>
  )
}

// ---------- shared UI helpers (kept inline for zero-file-splitting) ----------

function InvalidState({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <Card>
        <Eyebrow danger>Invitation</Eyebrow>
        <H1>{title}</H1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>{message}</p>
        <PrimaryLink href="/dashboard">Back to dashboard</PrimaryLink>
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F4F7F5' }}>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl w-full"
      style={{
        maxWidth: 460, padding: 32, border: '1px solid #E2E8F0',
        boxShadow: '0 1px 2px rgba(12,19,17,.05), 0 6px 12px -4px rgba(12,19,17,.08)',
      }}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: 1.6, fontWeight: 700,
      color: danger ? '#A32D2D' : '#1A7F64',
      marginBottom: 12, textTransform: 'uppercase', fontFamily: 'monospace',
    }}>
      {children}
    </div>
  )
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontSize: 24, lineHeight: 1.2, color: '#1A1A2E', marginBottom: 4, fontWeight: 700 }}>
      {children}
    </h1>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>{children}</p>
}

function Detail({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#F8FAFB', borderRadius: 12, padding: 16,
      marginBottom: 20, border: '1px solid #EFF3F1',
    }}>
      {children}
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline" style={{ gap: 12, fontSize: 14, padding: '6px 0' }}>
      <span style={{ color: '#6B7280' }}>{label}</span>
      <span style={{
        color: '#1A1A2E', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit',
        textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </span>
    </div>
  )
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full text-center rounded-lg font-medium transition-colors"
      style={{ backgroundColor: '#1A7F64', color: 'white', padding: '12px 16px', fontSize: 14 }}
    >
      {children}
    </Link>
  )
}

function prettifyRole(role: string): string {
  switch (role) {
    case 'facility_manager':    return 'Facility Manager'
    case 'facility_vet':        return 'Facility Vet'
    case 'facility_technician': return 'Facility Technician'
    default:                    return role
  }
}
