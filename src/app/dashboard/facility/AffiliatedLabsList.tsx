'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building, XCircle, Plus } from 'lucide-react'
import RequestLabAffiliationModal from './RequestLabAffiliationModal'

interface AffRow {
  lab_id: string
  facility_id: string
  status: string
  requested_at: string
  responded_at: string | null
  lab: { id: string; name: string; institution: string | null }
}

interface Props {
  facilityId: string
  affiliations: AffRow[]
  canManage: boolean
}

export default function AffiliatedLabsList({ facilityId, affiliations, canManage }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [, startTransition] = useTransition()

  const revoke = async (labId: string) => {
    setBusy(labId)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('revoke_facility_affiliation', {
      p_lab_id: labId,
      p_facility_id: facilityId,
    })
    setBusy(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) {
      setError(result?.error ?? 'Failed')
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center" style={{ gap: '8px' }}>
          <Building className="w-4 h-4" style={{ color: '#1A7F64' }} />
          <h2 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
            Affiliated labs ({affiliations.length})
          </h2>
        </div>
        {canManage && (
          <button
            onClick={() => setRequestOpen(true)}
            className="font-body font-medium inline-flex items-center"
            style={{
              backgroundColor: '#1A7F64', color: 'white',
              fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
              border: 'none', cursor: 'pointer', gap: '4px',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Request lab
          </button>
        )}
      </div>

      {error && (
        <div className="font-body mb-3 p-3 rounded"
          style={{ backgroundColor: '#FCEBEB', color: '#A32D2D', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {affiliations.length === 0 ? (
        <div className="border font-body p-4 rounded-lg"
          style={{ borderColor: '#E2E8F0', color: '#6B7280', fontSize: '13px', backgroundColor: 'white' }}>
          No active affiliations yet. When a lab and this facility both agree
          via the request/accept flow, they show up here.
        </div>
      ) : (
        <div className="space-y-2">
          {affiliations.map((row) => (
            <div
              key={row.lab_id}
              className="border flex items-center justify-between"
              style={{
                backgroundColor: 'white',
                borderColor: '#E2E8F0',
                borderRadius: '10px',
                padding: '14px 16px',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
                  {row.lab.name}
                </div>
                <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
                  {row.lab.institution ? `${row.lab.institution} · ` : ''}
                  Active since {row.responded_at ? new Date(row.responded_at).toLocaleDateString() : '—'}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => revoke(row.lab_id)}
                  disabled={busy === row.lab_id}
                  className="font-body font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'white', color: '#A32D2D',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px', padding: '6px 12px', borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span className="inline-flex items-center" style={{ gap: '4px' }}>
                    <XCircle className="w-3.5 h-3.5" />
                    End affiliation
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {requestOpen && (
        <RequestLabAffiliationModal
          facilityId={facilityId}
          onClose={() => setRequestOpen(false)}
        />
      )}
    </section>
  )
}
