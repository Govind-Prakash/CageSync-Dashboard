'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Check, X } from 'lucide-react'

interface AffRow {
  lab_id: string
  facility_id: string
  status: string
  requested_by_side: 'lab' | 'facility'
  requested_at: string
  responded_at: string | null
  notes: string | null
  facility: { id: string; name: string; institution: string | null }
}

interface Props {
  /// Current user's active lab. Section shows nothing if null.
  labId: string | null
  /// Only PIs and lab_managers can accept/revoke. Section is
  /// visible to everyone else but read-only for non-approvers.
  canApprove: boolean
}

/// Lab PI's / lab_manager's view of facility oversight requests.
/// Fetches lab_facility_affiliations where this lab is involved
/// and provides accept/decline/revoke actions.
///
/// Ships as III-5: lets a lab respond to a facility that asked
/// "can we oversee your welfare data?", and end active
/// affiliations that no longer make sense.
export default function FacilityRequestsSection({ labId, canApprove }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<AffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchRows = useCallback(async () => {
    if (!labId) {
      setRows([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('lab_facility_affiliations')
      .select(`
        lab_id, facility_id, status, requested_by_side,
        requested_at, responded_at, notes,
        facility:facilities!inner (id, name, institution)
      `)
      .eq('lab_id', labId)
      .in('status', ['pending', 'active'])

    // Supabase JS types joined embeds as an array even for one-to-
    // many that will always return exactly one row (via !inner and
    // a FK). Normalize to a single object so the render code below
    // isn't full of Array.isArray dance.
    const normalized = (data ?? []).map((r: any) => ({
      ...r,
      facility: Array.isArray(r.facility) ? r.facility[0] : r.facility,
    })) as AffRow[]
    setRows(normalized)
    setLoading(false)
  }, [supabase, labId])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const call = async (
    rpc: 'accept_facility_affiliation' | 'revoke_facility_affiliation',
    facilityId: string,
    key: string,
  ) => {
    if (!labId) return
    setBusy(key)
    setMessage(null)
    const { data, error } = await supabase.rpc(rpc, {
      p_lab_id: labId,
      p_facility_id: facilityId,
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setBusy(null)
      return
    }
    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) {
      setMessage({ type: 'error', text: result?.error ?? 'Failed' })
      setBusy(null)
      return
    }
    setMessage({ type: 'success', text: rpc === 'accept_facility_affiliation' ? 'Accepted' : 'Ended' })
    await fetchRows()
    setBusy(null)
    setTimeout(() => setMessage(null), 3000)
  }

  if (!labId) return null

  const inbound = rows.filter((r) => r.status === 'pending' && r.requested_by_side === 'facility')
  const outbound = rows.filter((r) => r.status === 'pending' && r.requested_by_side === 'lab')
  const active = rows.filter((r) => r.status === 'active')

  // Hide the whole section when there's nothing to show AND the
  // user can't do anything about it. PIs still see the header so
  // they know the feature exists.
  if (inbound.length === 0 && active.length === 0 && outbound.length === 0 && !canApprove) {
    return null
  }

  return (
    <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      <div className="flex items-center mb-1" style={{ gap: '8px' }}>
        <Building2 className="w-4 h-4" style={{ color: '#1A7F64' }} />
        <h4 className="font-display font-medium"
          style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500 }}>
          Facility oversight
        </h4>
      </div>
      <p className="font-body mb-4"
        style={{ color: '#6B7280', fontSize: '13px' }}>
        Facilities that oversee your lab's welfare data.
        {!canApprove && ' Only the PI or a lab manager can accept or end affiliations.'}
      </p>

      {message && (
        <div
          className="font-body mb-3 p-2 rounded"
          style={{
            backgroundColor: message.type === 'success' ? '#E8F5F1' : '#FCEBEB',
            color: message.type === 'success' ? '#1A7F64' : '#A32D2D',
            fontSize: '13px',
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="font-body" style={{ color: '#9CA3AF', fontSize: '13px' }}>
          Loading…
        </div>
      ) : (
        <div className="space-y-2">
          {inbound.map((row) => (
            <RequestCard key={row.facility_id} row={row} kind="inbound"
              canApprove={canApprove}
              busy={busy === `in-${row.facility_id}`}
              onAccept={() => call('accept_facility_affiliation', row.facility_id, `in-${row.facility_id}`)}
              onDecline={() => call('revoke_facility_affiliation', row.facility_id, `in-${row.facility_id}`)}
            />
          ))}
          {outbound.map((row) => (
            <RequestCard key={row.facility_id} row={row} kind="outbound"
              canApprove={canApprove}
              busy={busy === `out-${row.facility_id}`}
              onDecline={() => call('revoke_facility_affiliation', row.facility_id, `out-${row.facility_id}`)}
            />
          ))}
          {active.map((row) => (
            <RequestCard key={row.facility_id} row={row} kind="active"
              canApprove={canApprove}
              busy={busy === `act-${row.facility_id}`}
              onDecline={() => call('revoke_facility_affiliation', row.facility_id, `act-${row.facility_id}`)}
            />
          ))}
          {inbound.length + active.length + outbound.length === 0 && (
            <div className="font-body p-3 border rounded"
              style={{
                borderColor: '#E2E8F0', color: '#6B7280', fontSize: '13px',
                backgroundColor: 'white',
              }}>
              No facility oversight relationships yet. When a facility invites
              you (or you request one — coming soon), it shows up here.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RequestCard({
  row,
  kind,
  canApprove,
  busy,
  onAccept,
  onDecline,
}: {
  row: AffRow
  kind: 'inbound' | 'outbound' | 'active'
  canApprove: boolean
  busy: boolean
  onAccept?: () => void
  onDecline?: () => void
}) {
  const badge =
    kind === 'inbound'  ? { bg: '#FEF3D8', fg: '#854F0B', label: 'PENDING · they asked' } :
    kind === 'outbound' ? { bg: '#EEF2FF', fg: '#3730A3', label: 'PENDING · we asked' } :
                          { bg: '#E8F5F1', fg: '#1A7F64', label: 'ACTIVE' }
  return (
    <div
      className="border flex items-center justify-between"
      style={{
        backgroundColor: 'white',
        borderColor: '#E2E8F0',
        borderRadius: '8px',
        padding: '12px 14px',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center mb-1" style={{ gap: '8px' }}>
          <span
            className="font-body font-medium"
            style={{
              backgroundColor: badge.bg, color: badge.fg,
              fontSize: '10px', padding: '2px 6px', borderRadius: '3px',
              letterSpacing: 0.3,
            }}
          >
            {badge.label}
          </span>
        </div>
        <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '13.5px' }}>
          {row.facility.name}
        </div>
        <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
          {row.facility.institution ? `${row.facility.institution} · ` : ''}
          {kind === 'active' && row.responded_at
            ? `Active since ${new Date(row.responded_at).toLocaleDateString()}`
            : `${relativeTime(row.requested_at)}`}
        </div>
        {row.notes && (
          <div className="font-body mt-1"
            style={{ color: '#374151', fontSize: '12px', fontStyle: 'italic' }}>
            "{row.notes}"
          </div>
        )}
      </div>
      {canApprove && (
        <div className="flex" style={{ gap: '6px' }}>
          {kind === 'inbound' && onAccept && (
            <button onClick={onAccept} disabled={busy}
              className="font-body font-medium disabled:opacity-50"
              style={{
                backgroundColor: '#1A7F64', color: 'white',
                fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                border: 'none', cursor: 'pointer',
              }}>
              <span className="inline-flex items-center" style={{ gap: '4px' }}>
                <Check className="w-3.5 h-3.5" />
                Accept
              </span>
            </button>
          )}
          {onDecline && (
            <button onClick={onDecline} disabled={busy}
              className="font-body font-medium disabled:opacity-50"
              style={{
                backgroundColor: 'white', color: '#A32D2D',
                border: '1px solid #E2E8F0',
                fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                cursor: 'pointer',
              }}>
              <span className="inline-flex items-center" style={{ gap: '4px' }}>
                {kind === 'active' ? null : <X className="w-3.5 h-3.5" />}
                {kind === 'active'   ? 'End affiliation' :
                 kind === 'outbound' ? 'Cancel request'  : 'Decline'}
              </span>
            </button>
          )}
        </div>
      )}
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
