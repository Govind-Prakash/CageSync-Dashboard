'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Check } from 'lucide-react'

interface Props {
  institutionId: string
  institutionName: string
  emailDomains: string[]
  onClose: () => void
  onVerified?: () => void
}

/**
 * Two-step modal for the email-code fallback (II-4).
 *
 * Step 1 (request): user enters their institutional email; the API
 * route validates the domain against institution.email_domains,
 * generates a 6-digit code, stores its sha256 hash, and emails the
 * raw code via Resend.
 *
 * Step 2 (verify): user types the code; the client calls
 * verify_institution_code(institution_id, code) RPC. On success it
 * writes a user_institution_verifications row and closes the modal.
 */
export default function InstitutionVerificationDialog({
  institutionId,
  institutionName,
  emailDomains,
  onClose,
  onVerified,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [phase, setPhase] = useState<'request' | 'verify' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const domainHint = emailDomains.length === 1
    ? `Use your @${emailDomains[0]} email.`
    : `Use one of: ${emailDomains.map((d) => `@${d}`).join(', ')}`

  const sendCode = async () => {
    setError(null)
    const domain = email.trim().toLowerCase().split('@')[1] ?? ''
    if (!emailDomains.includes(domain)) {
      setError(`Email must be from an institutional domain. ${domainHint}`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/institutions/send-verification', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ institutionId, email: email.trim().toLowerCase() }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(humanize(json.error))
      } else {
        setPhase('verify')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code')
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setError(null)
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Code must be 6 digits.')
      return
    }
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('verify_institution_code', {
      p_institution_id: institutionId,
      p_code: code.trim(),
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    const result = data as { success: boolean; error?: string } | null
    if (!result?.success) {
      setError(humanize(result?.error))
      return
    }
    setPhase('done')
    onVerified?.()
    setTimeout(onClose, 1500)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6"
        style={{ width: '440px', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '16px' }}>
            Verify {institutionName}
          </h3>
          <button onClick={onClose} disabled={busy}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {phase === 'done' ? (
          <div className="text-center py-6">
            <Check className="w-10 h-10 mx-auto mb-2" style={{ color: '#1A7F64' }} />
            <p className="font-body" style={{ color: '#1A7F64', fontSize: '14px' }}>
              Verified. You now have {institutionName} access.
            </p>
          </div>
        ) : phase === 'verify' ? (
          <>
            <p className="font-body mb-3" style={{ color: '#374151', fontSize: '13px' }}>
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 15 minutes.
            </p>
            <label className="block font-body font-medium mb-1"
              style={{ color: '#374151', fontSize: '13px' }}>Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={busy}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
              className="w-full border font-mono text-center focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
              style={{
                borderColor: '#E2E8F0', borderRadius: '6px',
                padding: '12px 10px', fontSize: '22px',
                letterSpacing: '8px', color: '#1A1A2E',
              }}
            />
            {error && (
              <p className="font-body mt-3" style={{ color: '#A32D2D', fontSize: '13px' }}>
                {error}
              </p>
            )}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => { setPhase('request'); setCode(''); setError(null) }}
                disabled={busy}
                className="font-body font-medium disabled:opacity-50"
                style={{
                  color: '#6B7280', fontSize: '13px',
                  backgroundColor: 'transparent', border: 'none',
                }}
              >
                ← Different email
              </button>
              <button
                onClick={verifyCode}
                disabled={busy || code.length !== 6}
                className="font-body font-medium px-4 py-2 rounded disabled:opacity-50"
                style={{
                  backgroundColor: '#1A7F64', color: 'white',
                  fontSize: '13px', border: 'none', cursor: 'pointer',
                }}
              >
                {busy ? 'Verifying…' : 'Verify'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-body mb-3" style={{ color: '#374151', fontSize: '13px' }}>
              We'll email a 6-digit code to your institutional address. {domainHint}
            </p>
            <label className="block font-body font-medium mb-1"
              style={{ color: '#374151', fontSize: '13px' }}>Institutional email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder={`name@${emailDomains[0] ?? 'university.edu'}`}
              autoFocus
              className="w-full border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
              style={{
                borderColor: '#E2E8F0', borderRadius: '6px',
                padding: '8px 10px', fontSize: '14px', color: '#1A1A2E',
              }}
            />
            {error && (
              <p className="font-body mt-3" style={{ color: '#A32D2D', fontSize: '13px' }}>
                {error}
              </p>
            )}
            <div className="flex justify-end mt-6" style={{ gap: '8px' }}>
              <button onClick={onClose} disabled={busy}
                className="font-body font-medium px-4 py-2 rounded disabled:opacity-50"
                style={{ color: '#6B7280', fontSize: '13px', backgroundColor: 'transparent' }}>
                Cancel
              </button>
              <button onClick={sendCode} disabled={busy || !email}
                className="font-body font-medium px-4 py-2 rounded disabled:opacity-50"
                style={{
                  backgroundColor: '#1A7F64', color: 'white',
                  fontSize: '13px', border: 'none', cursor: 'pointer',
                }}>
                {busy ? 'Sending…' : 'Send code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function humanize(code?: string): string {
  switch (code) {
    case 'not_signed_in':          return 'Sign in first, then try again.'
    case 'no_active_code':         return 'Your code expired. Request a new one.'
    case 'too_many_attempts':      return 'Too many wrong tries. Request a new code.'
    case 'code_mismatch':          return 'That code doesn\'t match. Check the email and try again.'
    case 'domain_mismatch':        return 'Email domain doesn\'t match this institution.'
    case 'invalid_email':          return 'Please enter a valid email address.'
    case 'institution_not_active': return 'This institution isn\'t active in our registry.'
    default:                       return code || 'Something went wrong.'
  }
}
