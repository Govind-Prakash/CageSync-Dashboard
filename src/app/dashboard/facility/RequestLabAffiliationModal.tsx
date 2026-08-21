'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Search, Send, Check } from 'lucide-react'

interface Props {
  facilityId: string
  onClose: () => void
}

interface Institution {
  id: string
  common_name: string
  campuses: string[] | null
}

interface LabResult {
  id: string
  name: string
  campus: string | null
  pi_name: string | null
  pi_email: string | null
}

/**
 * II-5 UI. Modal for a facility manager to search labs at an
 * institution they're verified for + send a request_facility_
 * affiliation call in one flow.
 *
 * Flow:
 *   1. Fetch user's verified institutions (via
 *      user_institution_verifications join institutions). If
 *      none, tell them to verify first (link to Settings).
 *   2. Institution picker → optional campus dropdown → search box.
 *   3. Call search_labs RPC; render results.
 *   4. Per-row Request button → request_facility_affiliation RPC.
 *      On success show a per-row "Requested" check + refresh
 *      /dashboard/facility so the outbound-pending list updates.
 */
export default function RequestLabAffiliationModal({ facilityId, onClose }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [instId, setInstId] = useState('')
  const [campus, setCampus] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LabResult[]>([])
  const [loadingInsts, setLoadingInsts] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestedLabIds, setRequestedLabIds] = useState<Set<string>>(new Set())
  const [busyLabId, setBusyLabId] = useState<string | null>(null)

  // Load verified institutions.
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('user_institution_verifications')
        .select('institutions!inner (id, common_name, campuses)')
        .eq('user_id', user.id)
      const insts: Institution[] = (data ?? []).map((r: any) => {
        const inst = Array.isArray(r.institutions) ? r.institutions[0] : r.institutions
        return {
          id: inst.id,
          common_name: inst.common_name,
          campuses: inst.campuses,
        }
      })
      setInstitutions(insts)
      if (insts.length === 1) setInstId(insts[0].id)
      setLoadingInsts(false)
    })()
  }, [supabase])

  const activeInst = institutions.find((i) => i.id === instId)

  const runSearch = useCallback(async () => {
    if (!instId) return
    setSearching(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('search_labs', {
      p_institution_id: instId,
      p_campus: campus || null,
      p_query: query.trim() || null,
    })
    setSearching(false)
    if (rpcError) {
      setError(rpcError.message)
      setResults([])
      return
    }
    setResults((data ?? []) as LabResult[])
  }, [supabase, instId, campus, query])

  // Auto-run search when the institution changes (empty query → list all).
  useEffect(() => {
    if (instId) runSearch()
  }, [instId, runSearch])

  const requestOne = async (labId: string) => {
    setBusyLabId(labId)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('request_facility_affiliation', {
      p_lab_id: labId,
      p_facility_id: facilityId,
    })
    setBusyLabId(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) {
      setError(result?.error ?? 'Failed')
      return
    }
    setRequestedLabIds((prev) => new Set(prev).add(labId))
    router.refresh()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl"
        style={{ width: '580px', maxWidth: '92vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <h3 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '16px' }}>
            Request lab affiliation
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="px-6 py-4">
          {loadingInsts ? (
            <div className="font-body" style={{ color: '#9CA3AF', fontSize: '13px' }}>
              Loading institutions…
            </div>
          ) : institutions.length === 0 ? (
            <div
              className="font-body p-4 rounded"
              style={{
                backgroundColor: '#FEF3D8', color: '#854F0B', fontSize: '13px',
              }}
            >
              You need to verify at least one institution before you can search
              its labs. Head to <strong>Settings → Lab Profile → Institution
              Registry</strong> and use "Verify by email code".
            </div>
          ) : (
            <>
              {/* Institution + campus selectors */}
              <div className="grid grid-cols-2 mb-3" style={{ gap: '8px' }}>
                <div>
                  <label className="block font-body font-medium mb-1"
                    style={{ color: '#374151', fontSize: '12px' }}>Institution</label>
                  <select
                    value={instId}
                    onChange={(e) => { setInstId(e.target.value); setCampus('') }}
                    className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
                    style={{
                      borderColor: '#E2E8F0', borderRadius: '6px',
                      padding: '8px 10px', fontSize: '13px', color: '#1A1A2E',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="">Select…</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>{i.common_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-body font-medium mb-1"
                    style={{ color: '#374151', fontSize: '12px' }}>Campus (optional)</label>
                  <select
                    value={campus}
                    onChange={(e) => setCampus(e.target.value)}
                    disabled={!activeInst || !activeInst.campuses || activeInst.campuses.length === 0}
                    className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1] disabled:opacity-60"
                    style={{
                      borderColor: '#E2E8F0', borderRadius: '6px',
                      padding: '8px 10px', fontSize: '13px', color: '#1A1A2E',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="">All campuses</option>
                    {activeInst?.campuses?.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search input */}
              <div className="flex items-center border rounded mb-4"
                style={{ borderColor: '#E2E8F0', padding: '6px 10px', gap: '6px' }}>
                <Search className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
                  placeholder="Search lab name…"
                  className="flex-1 font-body focus:outline-none"
                  style={{ fontSize: '13px', border: 'none', background: 'transparent' }}
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); runSearch() }}
                    className="text-xs" style={{ color: '#6B7280' }}
                  >
                    clear
                  </button>
                )}
              </div>

              {error && (
                <p className="font-body mb-3 p-2 rounded"
                  style={{ backgroundColor: '#FCEBEB', color: '#A32D2D', fontSize: '13px' }}>
                  {error}
                </p>
              )}

              {/* Results */}
              {searching ? (
                <div className="font-body py-6 text-center" style={{ color: '#9CA3AF', fontSize: '13px' }}>
                  Searching…
                </div>
              ) : results.length === 0 ? (
                <div className="font-body py-6 text-center" style={{ color: '#9CA3AF', fontSize: '13px' }}>
                  No labs match. Try a different campus or query.
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((lab) => {
                    const requested = requestedLabIds.has(lab.id)
                    return (
                      <div
                        key={lab.id}
                        className="border flex items-center justify-between"
                        style={{
                          backgroundColor: 'white',
                          borderColor: '#E2E8F0',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          gap: '10px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
                            {lab.name}
                          </div>
                          <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
                            {lab.pi_name ? `PI: ${lab.pi_name}` : 'No PI recorded'}
                            {lab.campus ? ` · ${lab.campus}` : ''}
                          </div>
                        </div>
                        {requested ? (
                          <span className="inline-flex items-center font-body font-medium"
                            style={{ color: '#1A7F64', fontSize: '12px', gap: '4px' }}>
                            <Check className="w-3.5 h-3.5" />
                            Requested
                          </span>
                        ) : (
                          <button
                            onClick={() => requestOne(lab.id)}
                            disabled={busyLabId === lab.id}
                            className="font-body font-medium disabled:opacity-50 inline-flex items-center"
                            style={{
                              backgroundColor: '#1A7F64', color: 'white',
                              fontSize: '12px', padding: '5px 10px', borderRadius: '6px',
                              border: 'none', cursor: 'pointer', gap: '4px',
                            }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {busyLabId === lab.id ? 'Sending…' : 'Request'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex justify-end" style={{ borderColor: '#E2E8F0' }}>
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
      </div>
    </div>
  )
}
