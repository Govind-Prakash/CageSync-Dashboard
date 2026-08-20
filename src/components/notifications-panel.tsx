'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Bell, Flag, AlertTriangle, X, CheckCircle, ExternalLink } from 'lucide-react'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
  /// Fires whenever the unread count changes so the topbar bell
  /// badge can render the accurate number without an extra fetch.
  onUnreadCountChange?: (count: number) => void
}

type Severity = 'urgent' | 'attention' | 'info'
type Tier = 'flag' | 'humane'  // 'humane' = urgent tier (red icon)

interface NotificationItem {
  id: string
  cageLabel: string
  cageCode: string
  typeLabel: string
  severity: Severity
  notes: string | null
  createdAt: string
  dismissedLocally: boolean  // client-side only; not persisted
}

const PAGE_LIMIT = 10

export default function NotificationsPanel({ isOpen, onClose, onUnreadCountChange }: NotificationsPanelProps) {
  const supabase = useMemo(() => createClient(), [])
  const [activeTab, setActiveTab] = useState<'all' | 'flags'>('all')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  // ---- Fetch initial + resubscribe on realtime changes ----

  const fetchLatest = useCallback(async () => {
    // Get lab_id via profile; RLS ensures we only see our own row.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('lab_id')
      .eq('id', user.id)
      .single()
    const labId = profile?.lab_id
    if (!labId) {
      setNotifications([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('cage_flags')
      .select(`
        id, severity, notes, created_at,
        cage:cages!inner (label, cage_code),
        type:flag_types!inner (label)
      `)
      .eq('lab_id', labId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_LIMIT)

    setNotifications(
      (data ?? []).map((r: any) => ({
        id: r.id,
        cageLabel: r.cage.label ?? '',
        cageCode: r.cage.cage_code ?? '',
        typeLabel: r.type.label ?? 'Flag',
        severity: r.severity as Severity,
        notes: r.notes,
        createdAt: r.created_at,
        dismissedLocally: false,
      })),
    )
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  useEffect(() => {
    // Realtime subscription for cage_flags — refetch on any change so
    // insert/update/delete all reflect. Cheaper than merging locally
    // because we need the joined cage + type rows too.
    let channel: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles').select('lab_id').eq('id', user.id).single()
      const labId = profile?.lab_id
      if (!labId) return
      channel = supabase
        .channel(`topbar-cage_flags-${labId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cage_flags', filter: `lab_id=eq.${labId}` },
          () => { fetchLatest() },
        )
        .subscribe()
    })()
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, fetchLatest])

  // ---- Report unread count upward ----
  const visibleCount = notifications.filter((n) => !n.dismissedLocally).length
  useEffect(() => {
    onUnreadCountChange?.(visibleCount)
  }, [visibleCount, onUnreadCountChange])

  // ---- Local dismiss (client-side only) ----
  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, dismissedLocally: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, dismissedLocally: true })))
  }

  // ---- Close on outside click ----
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // ---- Helpers ----
  const tierFor = (sev: Severity): Tier => (sev === 'urgent' ? 'humane' : 'flag')
  const iconBackground = (tier: Tier) => (tier === 'humane' ? '#FCEBEB' : '#FEF3D8')
  const iconComponent = (tier: Tier) =>
    tier === 'humane'
      ? <AlertTriangle className="w-4 h-4" style={{ color: '#E53E3E' }} />
      : <Flag className="w-4 h-4" style={{ color: '#854F0B' }} />

  const relativeTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(iso).toLocaleDateString()
  }

  const filtered = notifications
    .filter((n) => !n.dismissedLocally)
    .filter((n) => activeTab === 'all' ? true : true) // both tabs show flags today

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-12 right-0 w-96 bg-white border rounded-xl shadow-xl z-50 overflow-hidden"
      style={{
        borderColor: '#E2E8F0',
        maxHeight: '520px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: '#E2E8F0' }}
      >
        <h2 className="font-display font-medium" style={{ fontSize: '15px', color: '#1A1A2E' }}>
          Notifications
        </h2>
        {visibleCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="hover:text-primary transition-colors"
            style={{ color: '#6B7280', fontSize: '12px' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs — kept for future non-flag notification types (wean reminders, etc.) */}
      <div className="flex border-b" style={{ borderColor: '#E2E8F0' }}>
        {(['all', 'flags'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 px-4 font-medium transition-colors"
            style={{
              fontSize: '13px',
              borderBottom: activeTab === tab ? '2px solid #1A7F64' : '2px solid transparent',
              color: activeTab === tab ? '#1A7F64' : '#6B7280',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center font-body" style={{ color: '#9CA3AF', fontSize: '13px' }}>
            Loading…
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((n) => {
            const tier = tierFor(n.severity)
            return (
              <div
                key={n.id}
                className="group px-4 py-3 border-b hover:bg-gray-50 transition-colors flex items-start relative"
                style={{ borderColor: '#F9FAFB', gap: '12px' }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: iconBackground(tier) }}
                >
                  {iconComponent(tier)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium line-clamp-1" style={{ fontSize: '13px', color: '#1A1A2E' }}>
                    {n.typeLabel} · {n.cageLabel || n.cageCode}
                  </h3>
                  {n.notes && (
                    <p className="mt-0.5 line-clamp-2" style={{ fontSize: '12px', color: '#6B7280' }}>
                      {n.notes}
                    </p>
                  )}
                  <p className="mt-1" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {relativeTime(n.createdAt)}
                  </p>
                </div>

                {/* Actions on hover */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ gap: '4px' }}>
                  <Link
                    href="/dashboard/flags"
                    onClick={onClose}
                    className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Open in flags"
                  >
                    <ExternalLink className="w-3 h-3" style={{ color: '#6B7280' }} />
                  </Link>
                  <button
                    onClick={() => dismissNotification(n.id)}
                    className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Dismiss (local only)"
                  >
                    <X className="w-3 h-3" style={{ color: '#6B7280' }} />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <CheckCircle className="w-8 h-8 mb-3" style={{ color: '#1A7F64' }} />
            <h3 className="font-medium mb-1" style={{ fontSize: '14px', color: '#1A1A2E' }}>
              All caught up
            </h3>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>
              No unresolved flags in this lab
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-center" style={{ borderColor: '#E2E8F0' }}>
        <Link
          href="/dashboard/flags"
          onClick={onClose}
          className="hover:underline transition-colors"
          style={{ fontSize: '13px', color: '#1A7F64' }}
        >
          View all flags →
        </Link>
      </div>
    </div>
  )
}
