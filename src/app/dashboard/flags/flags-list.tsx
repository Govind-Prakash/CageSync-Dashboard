'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, AlertTriangle, Info, Check, X, MessageSquare, Camera, ChevronDown } from 'lucide-react'

type Severity = 'urgent' | 'attention' | 'info'

interface FlagRow {
  id: string
  cage_id: string
  lab_id: string
  flag_type: string
  severity: Severity
  notes: string | null
  flagged_by: string | null
  resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  cage: { id: string; label: string; cage_code: string; cage_type: string }
  type: { id: string; label: string; icon: string }
}

interface Attachment { id: string; file_path: string }

interface Props {
  initialFlags: FlagRow[]
  attachmentsByFlag: Record<string, Attachment[]>
  labId: string | null
}

// Colors match the brand tokens used elsewhere in the dashboard.
const SEV_COLORS: Record<Severity, { bg: string; fg: string; label: string }> = {
  urgent:    { bg: '#FCEBEB', fg: '#A32D2D', label: 'Urgent' },
  attention: { bg: '#FEF3D8', fg: '#854F0B', label: 'Attention' },
  info:      { bg: '#E8F5F1', fg: '#1A7F64', label: 'Info' },
}

export default function FlagsList({ initialFlags, attachmentsByFlag: initialAttachments, labId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [flags, setFlags] = useState<FlagRow[]>(initialFlags)
  const [attachmentsByFlag, setAttachmentsByFlag] =
    useState<Record<string, Attachment[]>>(initialAttachments)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // -------- Realtime subscription --------
  useEffect(() => {
    if (!labId) return
    const channel = supabase
      .channel(`dashboard-cage_flags-${labId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cage_flags', filter: `lab_id=eq.${labId}` },
        async (payload) => {
          // On insert/update we need the joined cage + type rows too —
          // easiest is to refetch the changed row.
          const id =
            (payload.new as { id?: string })?.id ??
            (payload.old as { id?: string })?.id
          if (!id) return

          if (payload.eventType === 'DELETE') {
            setFlags((prev) => prev.filter((f) => f.id !== id))
            return
          }

          const { data: hydrated } = await supabase
            .from('cage_flags')
            .select(`
              *,
              cage:cages!inner (id, label, cage_code, cage_type),
              type:flag_types!inner (id, label, icon)
            `)
            .eq('id', id)
            .single()
          if (!hydrated) return

          setFlags((prev) => {
            const exists = prev.some((f) => f.id === id)
            if (exists) return prev.map((f) => (f.id === id ? (hydrated as FlagRow) : f))
            return [hydrated as FlagRow, ...prev]
          })

          // Also refresh attachments for this flag (a new flag might
          // arrive before its photos are inserted, so re-poll on echo).
          const { data: atts } = await supabase
            .from('cage_flag_attachments')
            .select('id, flag_id, file_path')
            .eq('flag_id', id)
          if (atts) {
            setAttachmentsByFlag((prev) => ({
              ...prev,
              [id]: atts.map((a) => ({ id: a.id, file_path: a.file_path })),
            }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, labId])

  // -------- Signed URLs for attachments --------
  useEffect(() => {
    const missing: string[] = []
    for (const arr of Object.values(attachmentsByFlag)) {
      for (const a of arr) {
        if (!signedUrls[a.file_path]) missing.push(a.file_path)
      }
    }
    if (missing.length === 0) return

    let cancelled = false
    ;(async () => {
      const results = await Promise.all(
        missing.map(async (path) => {
          const { data } = await supabase.storage
            .from('flag-attachments')
            .createSignedUrl(path, 60 * 60) // 1 hour
          return [path, data?.signedUrl ?? ''] as const
        }),
      )
      if (cancelled) return
      setSignedUrls((prev) => {
        const next = { ...prev }
        for (const [path, url] of results) {
          if (url) next[path] = url
        }
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [attachmentsByFlag, signedUrls, supabase])

  // -------- Resolve action --------
  const handleResolve = useCallback(
    async (flag: FlagRow) => {
      setResolvingId(flag.id)
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('cage_flags')
        .update({
          resolved: true,
          resolved_by: user?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', flag.id)

      if (error) {
        setMessage({ type: 'error', text: `Failed to resolve: ${error.message}` })
      } else {
        setMessage({ type: 'success', text: 'Flag resolved' })
        // Optimistic UI (realtime echo will overwrite in a second)
        setFlags((prev) =>
          prev.map((f) =>
            f.id === flag.id
              ? { ...f, resolved: true, resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() }
              : f,
          ),
        )
      }
      setResolvingId(null)
      setTimeout(() => setMessage(null), 3000)
    },
    [supabase],
  )

  // -------- Grouping --------
  const unresolved = flags.filter((f) => !f.resolved)
  const resolved = flags.filter((f) => f.resolved)
  const urgent = unresolved.filter((f) => f.severity === 'urgent')
  const attention = unresolved.filter((f) => f.severity === 'attention')
  const infoTier = unresolved.filter((f) => f.severity === 'info')

  return (
    <div className="mx-auto" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '20px' }}>
            Flags
          </h1>
          <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginTop: '4px' }}>
            {unresolved.length} unresolved · {resolved.length} resolved
          </p>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className="font-body mb-4"
          style={{
            backgroundColor: message.type === 'success' ? '#E8F5F1' : '#FCEBEB',
            color: message.type === 'success' ? '#1A7F64' : '#A32D2D',
            fontSize: '13px',
            padding: '10px 14px',
            borderRadius: '8px',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Empty state */}
      {flags.length === 0 && (
        <div
          className="border font-body"
          style={{
            borderColor: '#E2E8F0',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '14px',
            backgroundColor: 'white',
          }}
        >
          No flags yet. Flags posted from Flutter appear here in real time.
        </div>
      )}

      {/* Urgent */}
      {urgent.length > 0 && (
        <Section title="Urgent" icon={<AlertCircle className="w-4 h-4" style={{ color: '#A32D2D' }} />}>
          {urgent.map((f) => (
            <FlagCard
              key={f.id}
              flag={f}
              attachments={attachmentsByFlag[f.id] ?? []}
              signedUrls={signedUrls}
              onResolve={handleResolve}
              resolving={resolvingId === f.id}
            />
          ))}
        </Section>
      )}

      {/* Attention */}
      {attention.length > 0 && (
        <Section title="Attention" icon={<AlertTriangle className="w-4 h-4" style={{ color: '#854F0B' }} />}>
          {attention.map((f) => (
            <FlagCard
              key={f.id}
              flag={f}
              attachments={attachmentsByFlag[f.id] ?? []}
              signedUrls={signedUrls}
              onResolve={handleResolve}
              resolving={resolvingId === f.id}
            />
          ))}
        </Section>
      )}

      {/* Info */}
      {infoTier.length > 0 && (
        <Section title="Info" icon={<Info className="w-4 h-4" style={{ color: '#1A7F64' }} />}>
          {infoTier.map((f) => (
            <FlagCard
              key={f.id}
              flag={f}
              attachments={attachmentsByFlag[f.id] ?? []}
              signedUrls={signedUrls}
              onResolve={handleResolve}
              resolving={resolvingId === f.id}
            />
          ))}
        </Section>
      )}

      {/* Resolved collapsible */}
      {resolved.length > 0 && (
        <details className="mt-6">
          <summary
            className="cursor-pointer font-body font-medium flex items-center"
            style={{ color: '#6B7280', fontSize: '13px', gap: '6px' }}
          >
            <ChevronDown className="w-4 h-4" />
            {resolved.length} resolved
          </summary>
          <div className="mt-3 space-y-2">
            {resolved.map((f) => (
              <FlagCard
                key={f.id}
                flag={f}
                attachments={attachmentsByFlag[f.id] ?? []}
                signedUrls={signedUrls}
                onResolve={handleResolve}
                resolving={resolvingId === f.id}
                muted
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// -------- helpers --------

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center mb-3" style={{ gap: '8px' }}>
        {icon}
        <h2 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
          {title}
        </h2>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function FlagCard({
  flag,
  attachments,
  signedUrls,
  onResolve,
  resolving,
  muted = false,
}: {
  flag: FlagRow
  attachments: Attachment[]
  signedUrls: Record<string, string>
  onResolve: (flag: FlagRow) => void
  resolving: boolean
  muted?: boolean
}) {
  const sev = SEV_COLORS[flag.severity]
  const timeAgo = relativeTime(flag.created_at)

  return (
    <div
      className="border font-body"
      style={{
        backgroundColor: 'white',
        borderColor: '#E2E8F0',
        borderRadius: '12px',
        padding: '16px',
        opacity: muted ? 0.65 : 1,
      }}
    >
      {/* top row: severity + cage + time */}
      <div className="flex items-center justify-between mb-2" style={{ gap: '8px' }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <span
            className="font-body font-medium"
            style={{
              backgroundColor: sev.bg,
              color: sev.fg,
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: 0.3,
            }}
          >
            {sev.label.toUpperCase()}
          </span>
          <Link
            href="/dashboard/cages"
            className="font-body font-medium hover:underline"
            style={{ color: '#1A7F64', fontSize: '13px' }}
          >
            {flag.cage.label || flag.cage.cage_code}
          </Link>
          <span className="font-body" style={{ color: '#9CA3AF', fontSize: '12px' }}>
            · {flag.cage.cage_code}
          </span>
        </div>
        <span className="font-body" style={{ color: '#9CA3AF', fontSize: '12px' }}>
          {timeAgo}
        </span>
      </div>

      {/* type + notes */}
      <div className="mb-3">
        <div className="font-body font-medium mb-1" style={{ color: '#1A1A2E', fontSize: '14px' }}>
          {flag.type.label}
        </div>
        {flag.notes && (
          <div className="font-body" style={{ color: '#374151', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
            {flag.notes}
          </div>
        )}
      </div>

      {/* photos */}
      {attachments.length > 0 && (
        <div className="flex mb-3" style={{ gap: '8px' }}>
          {attachments.map((a) => {
            const url = signedUrls[a.file_path]
            return (
              <a
                key={a.id}
                href={url || '#'}
                target="_blank"
                rel="noreferrer"
                className="block border"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  borderColor: '#E2E8F0',
                  backgroundColor: '#F3F4F6',
                }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="flag" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Camera className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                  </div>
                )}
              </a>
            )
          })}
        </div>
      )}

      {/* footer: resolve state / action */}
      <div className="flex items-center justify-between" style={{ paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
        {flag.resolved ? (
          <div className="flex items-center font-body" style={{ color: '#1A7F64', fontSize: '12px', gap: '6px' }}>
            <Check className="w-4 h-4" />
            Resolved {flag.resolved_at ? relativeTime(flag.resolved_at) : ''}
          </div>
        ) : (
          <div className="flex items-center font-body" style={{ color: '#9CA3AF', fontSize: '12px', gap: '6px' }}>
            <MessageSquare className="w-3.5 h-3.5" />
            Unresolved
          </div>
        )}
        {!flag.resolved && (
          <button
            onClick={() => onResolve(flag)}
            disabled={resolving}
            className="font-body font-medium disabled:opacity-50"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: resolving ? 'wait' : 'pointer',
            }}
          >
            {resolving ? 'Resolving…' : 'Mark resolved'}
          </button>
        )}
      </div>
    </div>
  )
}

function relativeTime(iso: string) {
  const now = new Date()
  const then = new Date(iso)
  const diffSec = Math.floor((now.getTime() - then.getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return then.toLocaleDateString()
}
