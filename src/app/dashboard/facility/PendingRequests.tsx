'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Inbox, Send, Check, X } from 'lucide-react'

interface AffRow {
  lab_id: string
  facility_id: string
  status: string
  requested_by_side: 'lab' | 'facility'
  requested_at: string
  notes: string | null
  lab: { id: string; name: string; institution: string | null }
}

interface Props {
  facilityId: string
  inbound: AffRow[]   // labs that asked us
  outbound: AffRow[]  // labs we asked
  canManage: boolean
}

export default function PendingRequests({ facilityId, inbound, outbound, canManage }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const call = async (rpc: string, params: Record<string, unknown>, key: string) => {
    setBusy(key)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc(rpc, params)
    setBusy(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) {
      setError(result?.error ?? 'Unknown error')
      return
    }
    startTransition(() => router.refresh())
  }

  if (inbound.length === 0 && outbound.length === 0) return null

  return (
    <section>
      <SectionHeader
        icon={<Inbox className="w-4 h-4" style={{ color: '#854F0B' }} />}
        title="Pending affiliation requests"
        count={inbound.length + outbound.length}
      />

      {error && <ErrorBar message={error} />}

      {inbound.length > 0 && (
        <>
          <SubHeader label="Inbound (labs waiting for you)" />
          <div className="space-y-2">
            {inbound.map((row) => {
              const key = `in-${row.lab_id}`
              return (
                <Card key={key}>
                  <LabInfo lab={row.lab} time={row.requested_at} notes={row.notes} />
                  {canManage && (
                    <div className="flex" style={{ gap: '8px' }}>
                      <button
                        onClick={() => call('accept_facility_affiliation', {
                          p_lab_id: row.lab_id, p_facility_id: facilityId,
                        }, key)}
                        disabled={busy === key || isPending}
                        className="font-body font-medium disabled:opacity-50"
                        style={{
                          backgroundColor: '#1A7F64', color: 'white',
                          fontSize: '12px', padding: '6px 12px', borderRadius: '6px',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        <span className="inline-flex items-center" style={{ gap: '4px' }}>
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </span>
                      </button>
                      <button
                        onClick={() => call('revoke_facility_affiliation', {
                          p_lab_id: row.lab_id, p_facility_id: facilityId,
                        }, key)}
                        disabled={busy === key || isPending}
                        className="font-body font-medium disabled:opacity-50"
                        style={{
                          backgroundColor: 'white', color: '#A32D2D',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px', padding: '6px 12px', borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      {outbound.length > 0 && (
        <>
          <SubHeader label="Outbound (waiting on lab response)" />
          <div className="space-y-2">
            {outbound.map((row) => {
              const key = `out-${row.lab_id}`
              return (
                <Card key={key}>
                  <LabInfo lab={row.lab} time={row.requested_at} notes={row.notes} />
                  {canManage && (
                    <button
                      onClick={() => call('revoke_facility_affiliation', {
                        p_lab_id: row.lab_id, p_facility_id: facilityId,
                      }, key)}
                      disabled={busy === key || isPending}
                      className="font-body font-medium disabled:opacity-50"
                      style={{
                        backgroundColor: 'white', color: '#6B7280',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px', padding: '6px 12px', borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel request
                    </button>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center mb-3" style={{ gap: '8px' }}>
      {icon}
      <h2 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
        {title}{count !== undefined ? ` (${count})` : ''}
      </h2>
    </div>
  )
}

function SubHeader({ label }: { label: string }) {
  return (
    <div className="font-body font-medium mt-4 mb-2" style={{ color: '#6B7280', fontSize: '11px', letterSpacing: 0.4 }}>
      {label.toUpperCase()}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border flex items-center justify-between"
      style={{
        backgroundColor: 'white',
        borderColor: '#E2E8F0',
        borderRadius: '10px',
        padding: '14px 16px',
        gap: '12px',
      }}
    >
      {children}
    </div>
  )
}

function LabInfo({ lab, time, notes }: {
  lab: { name: string; institution: string | null }
  time: string
  notes: string | null
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
        {lab.name}
      </div>
      <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
        {lab.institution ? `${lab.institution} · ` : ''}{relativeTime(time)}
      </div>
      {notes && (
        <div className="font-body mt-1" style={{ color: '#374151', fontSize: '12px' }}>
          "{notes}"
        </div>
      )}
    </div>
  )
}

function ErrorBar({ message }: { message: string }) {
  return (
    <div
      className="font-body mb-3 p-3 rounded"
      style={{ backgroundColor: '#FCEBEB', color: '#A32D2D', fontSize: '13px' }}
    >
      {message}
    </div>
  )
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
