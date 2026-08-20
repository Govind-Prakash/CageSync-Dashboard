'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Client-side accept button for facility invites. Calls
 * `accept_facility_invite` and on success routes to /dashboard.
 * (There is no /dashboard/facility landing page yet — that ships
 * in III-4. Until then a fresh facility member lands on the main
 * dashboard so they at least see something.)
 */
export default function AcceptFacilityButton({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleAccept() {
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('accept_facility_invite', {
      p_token: token,
    })

    if (rpcError) {
      setError(rpcError.message)
      setSubmitting(false)
      return
    }

    const result = data as
      | { success: boolean; error?: string; facility_id?: string; invite_email?: string }
      | null

    if (!result?.success) {
      setError(humanizeError(result?.error, result?.invite_email))
      setSubmitting(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg"
          style={{ backgroundColor: '#FCEBEB', color: '#A32D2D', fontSize: 13 }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handleAccept}
        disabled={submitting}
        className="block w-full text-center rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          backgroundColor: '#1A7F64',
          color: 'white',
          padding: '12px 16px',
          fontSize: 14,
          border: 'none',
        }}
      >
        {submitting ? 'Accepting…' : 'Accept invitation'}
      </button>
    </>
  )
}

function humanizeError(code?: string, inviteEmail?: string): string {
  switch (code) {
    case 'not_signed_in':
      return 'You need to be signed in to accept a facility invitation.'
    case 'invalid_or_expired':
      return 'This invitation is no longer valid. It may have expired or been used already.'
    case 'email_mismatch':
      return inviteEmail
        ? `This invitation was sent to ${inviteEmail}. Sign in with that email to accept.`
        : 'This invitation was sent to a different email address.'
    default:
      return code ? `Could not accept invitation: ${code}` : 'Could not accept invitation.'
  }
}
