'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface InviteMemberModalProps {
  children: React.ReactNode
}

export default function InviteMemberModal({ children }: InviteMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Form state
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('researcher')

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const { error } = await supabase
        .from('lab_invites')
        .insert({
          email: email.trim().toLowerCase(),
          role: role,
          lab_id: null, // Will be added when lab setup is implemented
          accepted: false
        })

      if (error) throw error

      // Show success message
      setSuccessMessage(`Invitation sent to ${email.trim()}`)

      // Reset form
      setEmail('')
      setRole('researcher')

      // Refresh the page after a delay to show new invite
      setTimeout(() => {
        router.refresh()
        setIsOpen(false)
        setSuccessMessage('')
      }, 2000)

    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        setError('An invitation has already been sent to this email')
      } else {
        setError(error.message || 'Error sending invitation')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false)
      setError('')
      setSuccessMessage('')
      // Reset form when closing
      setEmail('')
      setRole('researcher')
    }
  }

  return (
    <>
      {/* Trigger */}
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={handleClose}
          />

          {/* Modal Card */}
          <div
            className="relative bg-white rounded-xl w-full mx-4"
            style={{ maxWidth: '448px', padding: '24px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2
                className="font-display font-medium"
                style={{
                  color: '#1A1A2E',
                  fontSize: '16px'
                }}
              >
                Invite Team Member
              </h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div
                className="mb-4 p-3 rounded-lg"
                style={{
                  backgroundColor: '#E8F5F1',
                  color: '#1A7F64'
                }}
              >
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="mb-4 p-3 rounded-lg"
                style={{
                  backgroundColor: '#FCEBEB',
                  color: '#A32D2D'
                }}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  className="block font-body font-medium mb-1"
                  style={{
                    color: '#374151',
                    fontSize: '13px',
                    marginBottom: '4px'
                  }}
                >
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full border rounded-lg font-body focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: '#E2E8F0',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1A7F64'
                    e.target.style.boxShadow = '0 0 0 3px #E8F5F1'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0'
                    e.target.style.boxShadow = 'none'
                  }}
                  placeholder="colleague@university.edu"
                  required
                />
              </div>

              {/* Role Field */}
              <div>
                <label
                  className="block font-body font-medium mb-1"
                  style={{
                    color: '#374151',
                    fontSize: '13px',
                    marginBottom: '4px'
                  }}
                >
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full border rounded-lg font-body focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: '#E2E8F0',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1A7F64'
                    e.target.style.boxShadow = '0 0 0 3px #E8F5F1'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E2E8F0'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <option value="researcher">Researcher</option>
                  <option value="lab_manager">Lab Manager</option>
                  <option value="technician">Technician</option>
                  <option value="observer">Observer</option>
                </select>
              </div>

              {/* Note */}
              <div
                className="text-center font-body"
                style={{
                  color: '#6B7280',
                  fontSize: '13px',
                  marginTop: '16px'
                }}
              >
                An invitation email will be sent. Invite expires in 7 days.
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="w-full border rounded-lg font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#6B7280',
                    padding: '10px',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full rounded-lg font-body font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#1A7F64',
                    padding: '10px',
                    fontSize: '14px'
                  }}
                >
                  {isSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}