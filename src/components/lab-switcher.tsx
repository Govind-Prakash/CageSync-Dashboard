'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, FlaskConical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMyLabMemberships, type LabMembership } from '@/lib/supabase/lab'

/**
 * Compact lab switcher rendered in the dashboard topbar.
 *
 * Behavior:
 *   - Fetches lab_memberships on mount. Solo users (1 membership) see a
 *     static pill with the lab name. Multi-lab users see a dropdown.
 *   - Selecting a lab calls the set_active_lab RPC (SECURITY DEFINER,
 *     verifies membership) then router.refresh() so every server-rendered
 *     query re-runs against the new profiles.lab_id.
 *   - Renders nothing while loading or if the user has zero memberships
 *     (avoids a jarring flicker on new-user onboarding screens).
 */
export default function LabSwitcher() {
  const [memberships, setMemberships] = useState<LabMembership[]>([])
  const [activeLabId, setActiveLabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const [{ data: { user } }, memberships] = await Promise.all([
        supabase.auth.getUser(),
        getMyLabMemberships(supabase),
      ])
      if (cancelled) return

      let active: string | null = null
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('lab_id')
          .eq('id', user.id)
          .maybeSingle()
        active = (profile?.lab_id as string | undefined) ?? null
      }

      if (!cancelled) {
        setMemberships(memberships)
        setActiveLabId(active)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleSelect = async (labId: string) => {
    if (labId === activeLabId || switching) {
      setOpen(false)
      return
    }
    setSwitching(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('set_active_lab', { p_lab_id: labId })
    if (error || !(data as { success: boolean })?.success) {
      // eslint-disable-next-line no-console
      console.error('set_active_lab failed:', error, data)
      setSwitching(false)
      return
    }
    setActiveLabId(labId)
    setOpen(false)
    // Re-render server components with the new active lab context.
    router.refresh()
    setSwitching(false)
  }

  if (loading || memberships.length === 0) {
    return null
  }

  const active = memberships.find((m) => m.lab_id === activeLabId) ?? memberships[0]

  // Single-lab users: static pill, no dropdown affordance.
  if (memberships.length === 1) {
    return (
      <div
        className="inline-flex items-center rounded-lg px-2.5 py-1"
        style={{
          backgroundColor: '#F8FAFB',
          border: '1px solid #EFF3F1',
          color: '#1A1A2E',
        }}
      >
        <FlaskConical className="w-3.5 h-3.5 mr-1.5" style={{ color: '#1A7F64' }} />
        <span className="font-body font-medium" style={{ fontSize: 12 }}>
          {active.lab_name}
        </span>
      </div>
    )
  }

  // Multi-lab: dropdown.
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="inline-flex items-center rounded-lg px-2.5 py-1 transition-colors disabled:opacity-60"
        style={{
          backgroundColor: '#F8FAFB',
          border: '1px solid #EFF3F1',
          color: '#1A1A2E',
        }}
      >
        <FlaskConical className="w-3.5 h-3.5 mr-1.5" style={{ color: '#1A7F64' }} />
        <span className="font-body font-medium mr-1" style={{ fontSize: 12 }}>
          {active.lab_name}
        </span>
        <ChevronDown className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1 rounded-lg bg-white shadow-lg z-50 overflow-hidden"
          style={{
            border: '1px solid #E2E8F0',
            minWidth: 220,
            maxWidth: 320,
          }}
          role="menu"
        >
          <div
            className="px-3 py-2"
            style={{
              backgroundColor: '#F8FAFB',
              borderBottom: '1px solid #EFF3F1',
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: '#6B7280',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}
          >
            Your labs
          </div>
          <ul className="py-1">
            {memberships.map((m) => {
              const isActive = m.lab_id === active.lab_id
              return (
                <li key={m.lab_id}>
                  <button
                    onClick={() => handleSelect(m.lab_id)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: '#1A1A2E' }}
                    role="menuitem"
                  >
                    <div className="flex flex-col min-w-0">
                      <span
                        className="font-body font-medium truncate"
                        style={{ fontSize: 13 }}
                      >
                        {m.lab_name}
                      </span>
                      <span
                        className="font-body"
                        style={{
                          fontSize: 11,
                          color: '#6B7280',
                          textTransform: 'capitalize',
                        }}
                      >
                        {m.role.replace('_', ' ')}
                      </span>
                    </div>
                    {isActive && (
                      <Check className="w-4 h-4 flex-shrink-0 ml-3" style={{ color: '#1A7F64' }} />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
