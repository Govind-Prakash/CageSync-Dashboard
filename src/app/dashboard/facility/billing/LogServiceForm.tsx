'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseAmountInput, formatMoney } from '@/lib/currency'

interface CageOption {
  id: string
  name: string | null
  barcode: string | null
  lab: { id: string; name: string | null } | { id: string; name: string | null }[]
}

interface Props {
  currencyCode: string
  cages: CageOption[]
}

const SERVICE_TYPES = [
  { value: 'procedure',    label: 'Procedure' },
  { value: 'extra_care',   label: 'Extra care' },
  { value: 'weekend_care', label: 'Weekend care' },
  { value: 'medication',   label: 'Medication' },
  { value: 'other',        label: 'Other' },
]

export default function LogServiceForm({ currencyCode, cages }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [cageId, setCageId] = useState<string | null>(null)
  const [serviceType, setServiceType] = useState('procedure')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cages.slice(0, 10)
    return cages
      .filter((c) => {
        const lab = Array.isArray(c.lab) ? c.lab[0] : c.lab
        return (
          (c.name ?? '').toLowerCase().includes(q) ||
          (c.barcode ?? '').toLowerCase().includes(q) ||
          (lab?.name ?? '').toLowerCase().includes(q)
        )
      })
      .slice(0, 10)
  }, [query, cages])

  const selected = cageId ? cages.find((c) => c.id === cageId) : null
  const selectedLab = selected
    ? Array.isArray(selected.lab) ? selected.lab[0] : selected.lab
    : null

  const submit = async () => {
    setBusy(true)
    setMsg(null)

    if (!cageId) {
      setMsg({ kind: 'err', text: 'Pick a cage first.' })
      setBusy(false)
      return
    }
    const amountMinor = parseAmountInput(amount, currencyCode)
    if (amountMinor == null) {
      setMsg({ kind: 'err', text: 'Amount must be a non-negative number.' })
      setBusy(false)
      return
    }

    const { data, error } = await supabase.rpc('log_cage_service', {
      p_cage_id: cageId,
      p_service_type: serviceType,
      p_description: description.trim() || null,
      p_amount_minor: amountMinor,
      p_performed_at: new Date().toISOString(),
    })

    setBusy(false)
    if (error) {
      setMsg({ kind: 'err', text: humanize(error.message) })
      return
    }
    if (data && (data as any).success === false) {
      setMsg({ kind: 'err', text: humanize((data as any).error ?? 'log_failed') })
      return
    }

    setMsg({
      kind: 'ok',
      text: `Charged ${formatMoney(amountMinor, currencyCode)} to cage ${selected?.name ?? selected?.barcode ?? '—'}. Owner + PI notified.`,
    })
    // Reset for next entry
    setAmount('')
    setDescription('')
    setCageId(null)
    setQuery('')
    startTransition(() => router.refresh())
  }

  return (
    <section
      style={{
        backgroundColor: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '16px',
      }}
    >
      <h2 className="font-display font-medium mb-1" style={{ color: '#1A1A2E', fontSize: '14px' }}>
        Log a service
      </h2>
      <p className="font-body mb-3" style={{ color: '#6B7280', fontSize: '12px' }}>
        Ad-hoc charge for extra vet work on a specific cage. Amount is billed to the cage's owner;
        the PI is also notified.
      </p>

      {/* Cage picker */}
      <label className="block font-body font-medium mb-1"
        style={{ color: '#374151', fontSize: '13px' }}>
        Cage
      </label>
      {selected ? (
        <div
          className="flex items-center justify-between border"
          style={{ borderColor: '#E2E8F0', borderRadius: '6px', padding: '8px 10px' }}
        >
          <div>
            <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
              {selected.name || selected.barcode || selected.id.slice(0, 8)}
            </div>
            <div className="font-body" style={{ color: '#6B7280', fontSize: '11px' }}>
              {selectedLab?.name ?? 'Unknown lab'} · barcode {selected.barcode ?? '—'}
            </div>
          </div>
          <button
            onClick={() => { setCageId(null); setQuery('') }}
            className="font-body"
            style={{ color: '#A32D2D', fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Change
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by cage name, barcode, or lab…"
            className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0', borderRadius: '6px',
              padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
            }}
          />
          {filtered.length > 0 && (
            <div
              className="border mt-1"
              style={{
                borderColor: '#E2E8F0', borderRadius: '6px',
                maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white',
              }}
            >
              {filtered.map((c, i) => {
                const lab = Array.isArray(c.lab) ? c.lab[0] : c.lab
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCageId(c.id); setQuery('') }}
                    className="w-full text-left"
                    style={{
                      padding: '8px 10px',
                      borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                      background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '13px' }}>
                      {c.name || c.barcode || c.id.slice(0, 8)}
                    </div>
                    <div className="font-body" style={{ color: '#6B7280', fontSize: '11px' }}>
                      {lab?.name ?? 'Unknown lab'} · barcode {c.barcode ?? '—'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {cages.length === 0 && (
            <p className="font-body mt-2" style={{ color: '#6B7280', fontSize: '12px' }}>
              No cages in labs affiliated with this facility yet.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <label className="block font-body font-medium mb-1"
            style={{ color: '#374151', fontSize: '13px' }}>
            Service type
          </label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            disabled={busy}
            className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0', borderRadius: '6px',
              padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
              backgroundColor: 'white',
            }}
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-body font-medium mb-1"
            style={{ color: '#374151', fontSize: '13px' }}>
            Amount ({currencyCode})
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            placeholder="45.00"
            className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0', borderRadius: '6px',
              padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
            }}
          />
        </div>
      </div>

      <label className="block font-body font-medium mb-1 mt-3"
        style={{ color: '#374151', fontSize: '13px' }}>
        Description (optional)
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={busy}
        rows={2}
        placeholder="e.g. Weekend feeding + water top-up, IP injection…"
        className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
        style={{
          borderColor: '#E2E8F0', borderRadius: '6px',
          padding: '8px 10px', fontSize: '13px', color: '#1A1A2E', resize: 'vertical',
        }}
      />

      {msg && (
        <p
          className="font-body mt-2"
          style={{ color: msg.kind === 'ok' ? '#1A7F64' : '#A32D2D', fontSize: '12px' }}
        >
          {msg.text}
        </p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={submit}
          disabled={busy || !cageId || !amount}
          className="font-body font-medium disabled:opacity-40"
          style={{
            backgroundColor: '#1A7F64', color: 'white',
            fontSize: '13px', padding: '8px 16px', borderRadius: '6px',
            border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Saving…' : 'Log service'}
        </button>
      </div>
    </section>
  )
}

function humanize(err: string): string {
  const e = err.toLowerCase()
  if (e.includes('not_authorized')) return 'Only the vet or facility manager can log services.'
  if (e.includes('cage_lab_has_no_facility'))
    return 'This cage\'s lab is not affiliated with a facility yet.'
  if (e.includes('cage_not_found')) return 'Cage not found.'
  if (e.includes('service_type_required')) return 'Pick a service type.'
  if (e.includes('non_negative') || e.includes('non-negative'))
    return 'Amount must be non-negative.'
  return err
}
