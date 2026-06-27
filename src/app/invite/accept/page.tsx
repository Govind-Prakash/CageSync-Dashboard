import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AcceptButton from './AcceptButton'

/**
 * /invite/accept?token=<uuid>
 *
 * Server component that resolves the invite token via the
 * `get_pending_invite` RPC (Step A) and renders one of four states:
 *   - no token / invalid / expired
 *   - signed-out + valid token  → sign-in CTA, preserves token through login
 *   - signed-in + email matches → renders <AcceptButton/> which calls accept_invite
 *   - signed-in + email mismatch → "wrong account" message
 *
 * Layout uses the same brand colors as the rest of the dashboard.
 */
export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <InvalidState
        title="No invitation token"
        message="This page expects an `?token=...` query parameter. The link you opened may have been truncated — ask the lab owner to send a new invite."
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invite, error: rpcError } = await supabase.rpc(
    'get_pending_invite',
    { p_token: token }
  )

  if (rpcError || !invite || !invite.id) {
    return (
      <InvalidState
        title="This invitation is no longer valid"
        message="Links expire 7 days after they're sent and can only be used once. Ask the lab owner to send a new one."
      />
    )
  }

  const { data: lab } = await supabase
    .from('labs')
    .select('name, institution')
    .eq('id', invite.lab_id)
    .maybeSingle()
  const labName = lab?.name ?? 'a CageSync lab'
  const labInstitution = lab?.institution ?? null

  const { data: inviter } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', invite.invited_by)
    .maybeSingle()
  const inviterName =
    inviter?.full_name || inviter?.email?.split('@')[0] || 'A lab admin'

  const prettyRole = prettifyRole(invite.role as string)

  // State 2: signed out → prompt sign in/up, carrying the token forward
  if (!user) {
    const next = `/invite/accept?token=${encodeURIComponent(token)}`
    const loginHref = `/login?next=${encodeURIComponent(next)}`
    return (
      <Shell>
        <Card>
          <Eyebrow>You're invited</Eyebrow>
          <H1>
            Join <strong>{labName}</strong>
          </H1>
          {labInstitution && <Sub>{labInstitution}</Sub>}
          <Detail>
            <Row label="Invited as" value={prettyRole} />
            <Row label="From" value={inviterName} />
            <Row label="For email" value={invite.email} mono />
          </Detail>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            Sign in (or create an account) to accept this invitation.
          </p>
          <PrimaryLink href={loginHref}>Sign in to accept</PrimaryLink>
        </Card>
      </Shell>
    )
  }

  // State 4: signed in but the account email doesn't match the invite
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell>
        <Card>
          <Eyebrow danger>Wrong account</Eyebrow>
          <H1>This invite is for a different email</H1>
          <Detail>
            <Row label="You're signed in as" value={user.email ?? '—'} mono />
            <Row label="Invite was sent to" value={invite.email} mono />
          </Detail>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
            Sign out and sign back in with{' '}
            <span style={{ fontFamily: 'monospace' }}>{invite.email}</span>, or
            ask the lab owner to re-send the invite to your current address.
          </p>
          <PrimaryLink href="/dashboard">Back to dashboard</PrimaryLink>
        </Card>
      </Shell>
    )
  }

  // State 3: ready to accept
  return (
    <Shell>
      <Card>
        <Eyebrow>You're invited</Eyebrow>
        <H1>
          Join <strong>{labName}</strong>
        </H1>
        {labInstitution && <Sub>{labInstitution}</Sub>}
        <Detail>
          <Row label="Joining as" value={prettyRole} />
          <Row label="Invited by" value={inviterName} />
        </Detail>
        <AcceptButton token={token} />
      </Card>
    </Shell>
  )
}

// ---------------------------------------------------------------------------
// State + presentational helpers (no extra files needed)
// ---------------------------------------------------------------------------

function InvalidState({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <Card>
        <Eyebrow danger>Invitation</Eyebrow>
        <H1>{title}</H1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
          {message}
        </p>
        <PrimaryLink href="/dashboard">Back to dashboard</PrimaryLink>
      </Card>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F4F7F5' }}
    >
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-2xl w-full"
      style={{
        maxWidth: 460,
        padding: 32,
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 2px rgba(12,19,17,.05), 0 6px 12px -4px rgba(12,19,17,.08)',
      }}
    >
      {children}
    </div>
  )
}

function Eyebrow({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 1.6,
        fontWeight: 700,
        color: danger ? '#A32D2D' : '#1A7F64',
        marginBottom: 12,
        textTransform: 'uppercase',
        fontFamily: 'monospace',
      }}
    >
      {children}
    </div>
  )
}

function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontSize: 24,
        lineHeight: 1.2,
        color: '#1A1A2E',
        marginBottom: 4,
        fontWeight: 700,
      }}
    >
      {children}
    </h1>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 20 }}>
      {children}
    </p>
  )
}

function Detail({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: '#F8FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        border: '1px solid #EFF3F1',
      }}
    >
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      className="flex justify-between items-baseline"
      style={{ gap: 12, fontSize: 14, padding: '6px 0' }}
    >
      <span style={{ color: '#6B7280' }}>{label}</span>
      <span
        style={{
          color: '#1A1A2E',
          fontWeight: 600,
          fontFamily: mono ? 'monospace' : 'inherit',
          textAlign: 'right',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function PrimaryLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="block w-full text-center rounded-lg font-medium transition-colors"
      style={{
        backgroundColor: '#1A7F64',
        color: 'white',
        padding: '12px 16px',
        fontSize: 14,
      }}
    >
      {children}
    </Link>
  )
}

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
