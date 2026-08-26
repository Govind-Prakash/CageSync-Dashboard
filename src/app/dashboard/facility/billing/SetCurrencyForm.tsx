'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COMMON_CURRENCIES } from '@/lib/currency'

interface Props {
  facilityId: string
  currentCurrency: string
}

export default function SetCurrencyForm({ facilityId, currentCurrency }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [code, setCode] = useState(currentCurrency)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const dirty = code !== currentCurrency

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    const { data, error } = await supabase.rpc('set_facility_currency', {
      p_facility_id: facilityId,
      p_currency_code: code,
    })
    setBusy(false)
    if (error) {
      setMsg({ kind: 'err', text: humanize(error.message) })
      return
    }
    if (data && (data as any).success === false) {
      setMsg({ kind: 'err', text: humanize((data as any).error ?? 'update_failed') })
      return
    }
    setMsg({ kind: 'ok', text: 'Currency updated. Past charges keep their original currency.' })
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
        Facility currency
      </h2>
      <p className="font-body mb-3" style={{ color: '#6B7280', fontSize: '12px' }}>
        All new bills and vet services will be displayed in this currency. Past rows keep their
        original currency (snapshotted at the time of the charge).
      </p>

      <div className="flex items-center" style={{ gap: '8px' }}>
        <select
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={busy}
          className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
          style={{
            borderColor: '#E2E8F0', borderRadius: '6px',
            padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
            backgroundColor: 'white',
          }}
        >
          {COMMON_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>

        <button
          onClick={submit}
          disabled={!dirty || busy}
          className="font-body font-medium disabled:opacity-40"
          style={{
            backgroundColor: '#1A7F64', color: 'white',
            fontSize: '13px', padding: '8px 14px', borderRadius: '6px',
            border: 'none', cursor: dirty && !busy ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>

      {msg && (
        <p
          className="font-body mt-2"
          style={{ color: msg.kind === 'ok' ? '#1A7F64' : '#A32D2D', fontSize: '12px' }}
        >
          {msg.text}
        </p>
      )}
    </section>
  )
}

function humanize(err: string): string {
  const e = err.toLowerCase()
  if (e.includes('not_authorized')) return 'Only the vet or facility manager can change currency.'
  if (e.includes('invalid_currency_code')) return 'Currency code must be 3 letters (e.g. USD, ILS).'
  return err
}
