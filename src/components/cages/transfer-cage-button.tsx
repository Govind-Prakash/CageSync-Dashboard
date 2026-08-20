'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRightLeft, X } from 'lucide-react'

interface Props {
  cageId: string
  cageLabel: string
  currentLabId: string
}

interface LabMembership {
  lab_id: string
  role: string
  labs: { name: string } | { name: string }[]
}

export default function TransferCageButton({ cageId, cageLabel, currentLabId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [memberships, setMemberships] = useState<LabMembership[]>([])
  const [targetLabId, setTargetLabId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('lab_memberships')
        .select('lab_id, role, labs!inner (name)')
        .eq('user_id', user.id)
      const others = (data ?? []).filter((m: any) => m.lab_id !== currentLabId)
      setMemberships(others as LabMembership[])
      setError(null)
    })()
  }, [open, supabase, currentLabId])

  const handleTransfer = async () => {
    if (!targetLabId) return
    setLoading(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('transfer_cage', {
      p_cage_id: cageId,
      p_to_lab_id: targetLabId,
    })
    setLoading(false)
    if (rpcError) {
      // Postgres error codes: 42501 = insufficient_privilege
      setError(
        rpcError.message.toLowerCase().includes('insufficient_privilege') ||
          rpcError.code === '42501'
          ? 'You need to be a writer in both labs to move this cage.'
          : rpcError.message,
      )
      return
    }
    setOpen(false)
    router.refresh() // server-side page re-renders without the transferred cage
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Move to another lab"
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
      >
        <ArrowRightLeft className="w-4 h-4" style={{ color: '#6B7280' }} />
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6"
            style={{ width: '440px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '16px' }}>
                Move cage
              </h3>
              <button
                onClick={() => !loading && setOpen(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" style={{ color: '#6B7280' }} />
              </button>
            </div>

            <p className="font-body mb-4" style={{ color: '#6B7280', fontSize: '13px' }}>
              Move <span style={{ color: '#1A1A2E', fontWeight: 500 }}>{cageLabel}</span>{' '}
              and all its animals, litters, treatments and flags to another lab.
              You must be a writer of the destination lab too.
            </p>

            {memberships.length === 0 ? (
              <div
                className="font-body p-3 rounded"
                style={{
                  backgroundColor: '#FEF3D8',
                  color: '#854F0B',
                  fontSize: '13px',
                }}
              >
                You only belong to one lab. Get invited to another lab first, then
                come back here to move cages.
              </div>
            ) : (
              <>
                <label className="block font-body font-medium mb-2"
                  style={{ color: '#374151', fontSize: '13px' }}>
                  Destination lab
                </label>
                <select
                  value={targetLabId}
                  onChange={(e) => setTargetLabId(e.target.value)}
                  disabled={loading}
                  className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
                  style={{
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '14px',
                    color: '#1A1A2E',
                    backgroundColor: 'white',
                  }}
                >
                  <option value="">Select a lab</option>
                  {memberships.map((m) => {
                    const labName = Array.isArray(m.labs)
                      ? m.labs[0]?.name
                      : m.labs?.name
                    return (
                      <option key={m.lab_id} value={m.lab_id}>
                        {labName} ({m.role})
                      </option>
                    )
                  })}
                </select>
              </>
            )}

            {error && (
              <p className="font-body mt-3"
                style={{ color: '#A32D2D', fontSize: '13px' }}>
                {error}
              </p>
            )}

            <div className="flex items-center justify-end mt-6" style={{ gap: '8px' }}>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="font-body font-medium px-4 py-2 rounded disabled:opacity-50"
                style={{
                  color: '#6B7280',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!targetLabId || loading || memberships.length === 0}
                className="font-body font-medium px-4 py-2 rounded transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#1A7F64',
                  color: 'white',
                  fontSize: '13px',
                }}
              >
                {loading ? 'Moving…' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
