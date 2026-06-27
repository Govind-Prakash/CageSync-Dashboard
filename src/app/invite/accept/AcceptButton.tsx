'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Client-side accept button. Calls the `accept_invite` SECURITY DEFINER
 * RPC; on success redirects to /dashboard/cages, on failure renders the
 * server-side error code as a human-readable message.
 *
 * Email-mismatch and not-signed-in cases are intentionally still handled
 * here as a defense-in-depth check — the server component already filters
 * those, but the RPC re-validates so a client that bypasses the UI flow
 * still gets a safe answer.
 */
export default function AcceptButton({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleAccept() {
    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('accept_invite', {
      p_token: token,
    })

    if (rpcError) {
      setError(rpcError.message)
      setSubmitting(false)
      return
    }

    const result = data as
      | { success: boolean; error?: string; lab_id?: string; invite_email?: string }
      | null

    if (!result?.success) {
      setError(humanizeError(result?.error, result?.invite_email))
      setSubmitting(false)
      return
    }

    // Success — straight to the cages list. The new lab is now the active
    // lab (the RPC also updated profiles.lab_id).
    router.push('/dashboard/cages')
    router.refresh()
  }

  return (
    <>
      {error && (
        <div
          className="mb-4 p-3 rounded-lg"
          style={{
            backgroundColor: '#FCEBEB',
            color: '#A32D2D',
            fontSize: 13,
          }}
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
      return 'You need to be signed in to accept an invitation.'
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
