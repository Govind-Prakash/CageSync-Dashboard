'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, X, Copy, Check } from 'lucide-react'

interface StaffRow {
  user_id: string
  role: string
  profiles: { id: string; full_name: string | null; email: string }
}

interface Props {
  facilityId: string
  staff: StaffRow[]
  canManage: boolean
}

const ROLES = [
  { value: 'facility_manager',    label: 'Facility Manager' },
  { value: 'facility_vet',        label: 'Facility Vet' },
  { value: 'facility_technician', label: 'Facility Technician' },
]

export default function FacilityStaffList({ facilityId, staff, canManage }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center" style={{ gap: '8px' }}>
          <Users className="w-4 h-4" style={{ color: '#1A7F64' }} />
          <h2 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
            Staff ({staff.length})
          </h2>
        </div>
        {canManage && (
          <button
            onClick={() => setInviteOpen(true)}
            className="font-body font-medium inline-flex items-center"
            style={{
              backgroundColor: '#1A7F64', color: 'white',
              fontSize: '13px', padding: '6px 12px', borderRadius: '6px',
              border: 'none', cursor: 'pointer', gap: '4px',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Invite
          </button>
        )}
      </div>

      <div className="border" style={{
        backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: '10px', overflow: 'hidden',
      }}>
        {staff.length === 0 ? (
          <div className="font-body p-4" style={{ color: '#6B7280', fontSize: '13px' }}>
            No staff yet.
          </div>
        ) : (
          staff.map((s, i) => {
            const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
            return (
              <div
                key={s.user_id}
                className="flex items-center justify-between"
                style={{
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
                    {p?.full_name || p?.email?.split('@')[0] || 'Unknown'}
                  </div>
                  <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
                    {p?.email}
                  </div>
                </div>
                <span
                  className="font-body"
                  style={{
                    backgroundColor: '#F3F4F6', color: '#374151',
                    fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
                  }}
                >
                  {formatRole(s.role)}
                </span>
              </div>
            )
          })
        )}
      </div>

      {inviteOpen && (
        <InviteFacilityMemberModal
          facilityId={facilityId}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </section>
  )
}

function formatRole(role: string) {
  switch (role) {
    case 'facility_manager':    return 'Facility Manager'
    case 'facility_vet':        return 'Facility Vet'
    case 'facility_technician': return 'Facility Technician'
    default:                    return role
  }
}

// ------------- invite modal -------------

function InviteFacilityMemberModal({ facilityId, onClose }: { facilityId: string; onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('facility_technician')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const submit = async () => {
    setBusy(true)
    setError(null)
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      setBusy(false)
      return
    }

    // Direct insert — RLS on facility_invites gates to facility_manager
    // via role_in_facility (see 0025).
    const { data, error: insErr } = await supabase
      .from('facility_invites')
      .insert({
        facility_id: facilityId,
        email: trimmed,
        role,
      })
      .select('token')
      .single()

    setBusy(false)
    if (insErr) {
      setError(
        insErr.message.toLowerCase().includes('permission') ||
          insErr.code === '42501'
          ? 'Only facility managers can invite staff.'
          : insErr.message,
      )
      return
    }
    setInviteToken(data?.token ?? null)
    startTransition(() => router.refresh())
  }

  const acceptUrl = inviteToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite-facility/accept?token=${inviteToken}`
    : ''

  const copyLink = async () => {
    if (!acceptUrl) return
    await navigator.clipboard.writeText(acceptUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6"
        style={{ width: '440px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '16px' }}>
            Invite staff
          </h3>
          <button onClick={onClose} disabled={busy}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {inviteToken ? (
          <>
            <p className="font-body mb-3" style={{ color: '#374151', fontSize: '13px' }}>
              Invite created. Share this link with{' '}
              <strong style={{ color: '#1A1A2E' }}>{email}</strong>. It expires in 7 days.
            </p>
            <div
              className="font-body flex items-center border rounded"
              style={{ borderColor: '#E2E8F0', padding: '8px 10px', gap: '8px' }}
            >
              <input
                readOnly
                value={acceptUrl}
                className="flex-1 font-body focus:outline-none"
                style={{ fontSize: '12px', color: '#374151', border: 'none', background: 'transparent' }}
              />
              <button
                onClick={copyLink}
                className="font-body font-medium inline-flex items-center"
                style={{
                  color: '#1A7F64', fontSize: '12px', gap: '4px',
                  border: 'none', backgroundColor: 'transparent', cursor: 'pointer',
                }}
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={onClose}
                className="font-body font-medium px-4 py-2 rounded"
                style={{
                  backgroundColor: '#1A7F64', color: 'white',
                  fontSize: '13px', border: 'none', cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="block font-body font-medium mb-1"
              style={{ color: '#374151', fontSize: '13px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder="name@example.com"
              className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1] mb-3"
              style={{
                borderColor: '#E2E8F0', borderRadius: '6px',
                padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
              }}
            />

            <label className="block font-body font-medium mb-1"
              style={{ color: '#374151', fontSize: '13px' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={busy}
              className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
              style={{
                borderColor: '#E2E8F0', borderRadius: '6px',
                padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
                backgroundColor: 'white',
              }}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            {error && (
              <p className="font-body mt-3" style={{ color: '#A32D2D', fontSize: '13px' }}>
                {error}
              </p>
            )}

            <div className="flex justify-end mt-6" style={{ gap: '8px' }}>
              <button onClick={onClose} disabled={busy}
                className="font-body font-medium px-4 py-2 rounded disabled:opacity-50"
                style={{ color: '#6B7280', fontSize: '13px', backgroundColor: 'transparent' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={busy || !email}
                className="font-body font-medium px-4 py-2 rounded disabled:opacity-50"
                style={{
                  backgroundColor: '#1A7F64', color: 'white',
                  fontSize: '13px', border: 'none', cursor: 'pointer',
                }}>
                {busy ? 'Creating…' : 'Create invite'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
