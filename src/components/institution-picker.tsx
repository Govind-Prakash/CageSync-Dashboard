'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Check, ChevronDown, X } from 'lucide-react'

export interface Institution {
  id: string
  canonical_name: string
  common_name: string
  country: string
  campuses: string[] | null
  email_domains: string[]
}

export interface InstitutionPickerValue {
  institutionId: string | null
  campus: string | null
}

interface Props {
  value: InstitutionPickerValue
  onChange: (v: InstitutionPickerValue) => void
  disabled?: boolean
}

// Small autocomplete for the ~24 seeded institutions. Since the list
// is bounded and shared, we fetch once on mount and filter in-memory
// rather than round-tripping to Supabase on every keystroke.
export function InstitutionPicker({ value, onChange, disabled }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from('institutions')
        .select('id, canonical_name, common_name, country, campuses, email_domains')
        .eq('status', 'active')
        .order('common_name', { ascending: true })

      if (cancelled) return
      if (err) {
        setError(err.message)
      } else {
        setInstitutions(data ?? [])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const selected = useMemo(
    () => institutions.find((i) => i.id === value.institutionId) ?? null,
    [institutions, value.institutionId],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return institutions
    return institutions.filter(
      (i) =>
        i.common_name.toLowerCase().includes(q) ||
        i.canonical_name.toLowerCase().includes(q) ||
        i.country.toLowerCase().includes(q),
    )
  }, [institutions, query])

  const handlePick = (inst: Institution) => {
    // Auto-fill campus when the institution has exactly one.
    const nextCampus =
      inst.campuses && inst.campuses.length === 1 ? inst.campuses[0] : null
    onChange({ institutionId: inst.id, campus: nextCampus })
    setOpen(false)
    setQuery('')
  }

  const handleClear = () => {
    onChange({ institutionId: null, campus: null })
  }

  // ---------- Render ----------

  return (
    <div ref={rootRef} className="relative" style={{ maxWidth: '480px' }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((o) => !o)}
        className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1] flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          borderColor: '#E2E8F0',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '14px',
          color: selected ? '#1A1A2E' : '#9CA3AF',
          height: '36px',
          backgroundColor: 'white',
        }}
      >
        <span className="truncate">
          {loading
            ? 'Loading institutions…'
            : selected
              ? selected.common_name
              : 'Select an institution'}
        </span>
        <span className="flex items-center" style={{ gap: '4px' }}>
          {selected && !disabled && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="rounded hover:bg-gray-100"
              style={{ padding: '2px' }}
              aria-label="Clear institution"
            >
              <X style={{ width: '14px', height: '14px', color: '#6B7280' }} />
            </span>
          )}
          <ChevronDown
            style={{
              width: '14px',
              height: '14px',
              color: '#6B7280',
              transform: open ? 'rotate(180deg)' : undefined,
              transition: 'transform 120ms ease',
            }}
          />
        </span>
      </button>

      {error && (
        <p
          className="font-body"
          style={{ color: '#A32D2D', fontSize: '12px', marginTop: '4px' }}
        >
          {error}
        </p>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 border shadow-lg"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderColor: '#E2E8F0',
            borderRadius: '8px',
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="flex items-center border-b"
            style={{
              padding: '8px 10px',
              gap: '8px',
              borderColor: '#F3F4F6',
            }}
          >
            <Search style={{ width: '14px', height: '14px', color: '#9CA3AF' }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search institutions…"
              className="flex-1 font-body focus:outline-none"
              style={{
                fontSize: '13px',
                color: '#1A1A2E',
                border: 'none',
                background: 'transparent',
              }}
            />
          </div>

          <div style={{ overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div
                className="font-body"
                style={{
                  color: '#9CA3AF',
                  fontSize: '13px',
                  padding: '12px 10px',
                  textAlign: 'center',
                }}
              >
                No matches. Missing yours? Contact support to add it.
              </div>
            )}

            {filtered.map((inst) => {
              const isSelected = inst.id === value.institutionId
              return (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => handlePick(inst)}
                  className="w-full text-left flex items-start hover:bg-gray-50"
                  style={{
                    padding: '8px 10px',
                    gap: '8px',
                    border: 'none',
                    background: isSelected ? '#E8F5F1' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="font-body font-medium truncate"
                      style={{ color: '#1A1A2E', fontSize: '13px' }}
                    >
                      {inst.common_name}
                    </div>
                    <div
                      className="font-body truncate"
                      style={{ color: '#6B7280', fontSize: '11px' }}
                    >
                      {inst.canonical_name} · {inst.country}
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      style={{
                        width: '14px',
                        height: '14px',
                        color: '#1A7F64',
                        marginTop: '2px',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Campus dropdown — only when selected institution has 2+ campuses */}
      {selected && selected.campuses && selected.campuses.length > 1 && (
        <div style={{ marginTop: '12px' }}>
          <label
            className="block font-body font-medium"
            style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}
          >
            Campus
          </label>
          <select
            value={value.campus ?? ''}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                institutionId: value.institutionId,
                campus: e.target.value || null,
              })
            }
            className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1] disabled:opacity-60"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: value.campus ? '#1A1A2E' : '#9CA3AF',
              height: '36px',
              backgroundColor: 'white',
              maxWidth: '480px',
            }}
          >
            <option value="">Select a campus</option>
            {selected.campuses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
