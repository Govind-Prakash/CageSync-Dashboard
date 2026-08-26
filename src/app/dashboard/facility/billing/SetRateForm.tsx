'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fractionDigitsFor, parseAmountInput, formatMoney } from '@/lib/currency'

interface Props {
  facilityId: string
  currencyCode: string
  currentWeeklyMinor: number | null
  currentSurchargeMinor: number | null
}

/// Vet enters rates in major units ("5.00" or "18.50"). We convert
/// to minor units before hitting the RPC.
export default function SetRateForm({
  facilityId,
  currencyCode,
  currentWeeklyMinor,
  currentSurchargeMinor,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const digits = fractionDigitsFor(currencyCode)
  const divisor = Math.pow(10, digits)

  const [weekly, setWeekly] = useState<string>(
    currentWeeklyMinor != null ? (currentWeeklyMinor / divisor).toFixed(digits) : ''
  )
  const [surcharge, setSurcharge] = useState<string>(
    currentSurchargeMinor != null ? (currentSurchargeMinor / divisor).toFixed(digits) : '0'
  )
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [, startTransition] = useTransition()

  const submit = async () => {
    setBusy(true)
    setMsg(null)

    const weeklyMinor = parseAmountInput(weekly, currencyCode)
    const surchargeMinor = parseAmountInput(surcharge || '0', currencyCode)

    if (weeklyMinor == null) {
      setMsg({ kind: 'err', text: 'Weekly rate must be a non-negative number.' })
      setBusy(false)
      return
    }
    if (surchargeMinor == null) {
      setMsg({ kind: 'err', text: 'Surcharge must be a non-negative number.' })
      setBusy(false)
      return
    }

    const { data, error } = await supabase.rpc('set_facility_billing_rate', {
      p_facility_id: facilityId,
      p_weekly_maintenance_minor: weeklyMinor,
      p_vet_delegation_surcharge_minor: surchargeMinor,
      p_effective_from: new Date().toISOString().slice(0, 10),
    })

    setBusy(false)
    if (error) {
      setMsg({ kind: 'err', text: humanize(error.message) })
      return
    }
    if (data && (data as any).success === false) {
      setMsg({ kind: 'err', text: humanize((data as any).error ?? 'save_failed') })
      return
    }

    setMsg({
      kind: 'ok',
      text: `Rate saved. Weekly ${formatMoney(weeklyMinor, currencyCode)} / cage, surcharge ${formatMoney(surchargeMinor, currencyCode)}.`,
    })
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
        Update rates
      </h2>
      <p className="font-body mb-3" style={{ color: '#6B7280', fontSize: '12px' }}>
        A new rate takes effect today and applies to the current month's bill. Past periods keep
        the rate that was in effect then.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-body font-medium mb-1"
            style={{ color: '#374151', fontSize: '13px' }}>
            Weekly maintenance / cage
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={weekly}
            onChange={(e) => setWeekly(e.target.value)}
            disabled={busy}
            placeholder={digits === 0 ? '5' : '5.00'}
            className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0', borderRadius: '6px',
              padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
            }}
          />
          <p className="font-body mt-1" style={{ color: '#9CA3AF', fontSize: '11px' }}>
            In {currencyCode}
          </p>
        </div>

        <div>
          <label className="block font-body font-medium mb-1"
            style={{ color: '#374151', fontSize: '13px' }}>
            Delegation surcharge / cage
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={surcharge}
            onChange={(e) => setSurcharge(e.target.value)}
            disabled={busy}
            placeholder="0"
            className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0', borderRadius: '6px',
              padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
            }}
          />
          <p className="font-body mt-1" style={{ color: '#9CA3AF', fontSize: '11px' }}>
            Extra per week when PI delegates all care to the vet.
          </p>
        </div>
      </div>

      {msg && (
        <p
          className="font-body mt-3"
          style={{ color: msg.kind === 'ok' ? '#1A7F64' : '#A32D2D', fontSize: '12px' }}
        >
          {msg.text}
        </p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={submit}
          disabled={busy || !weekly}
          className="font-body font-medium disabled:opacity-40"
          style={{
            backgroundColor: '#1A7F64', color: 'white',
            fontSize: '13px', padding: '8px 16px', borderRadius: '6px',
            border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Saving…' : 'Save rate'}
        </button>
      </div>
    </section>
  )
}

function humanize(err: string): string {
  const e = err.toLowerCase()
  if (e.includes('not_authorized')) return 'Only the vet or facility manager can set rates.'
  if (e.includes('non_negative') || e.includes('non-negative'))
    return 'Amounts must be non-negative.'
  return err
}
