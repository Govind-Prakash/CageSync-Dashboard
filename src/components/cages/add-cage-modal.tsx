'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AddCageModalProps {
  children: React.ReactNode
}

export default function AddCageModal({ children }: AddCageModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cageCode, setCageCode] = useState('')
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState<'active' | 'empty' | 'quarantine' | 'retired'>('empty')
  const [notes, setNotes] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cageCode.trim()) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('cages')
        .insert({
          cage_code: cageCode.trim(),
          label: label.trim() || null,
          status,
          notes: notes.trim() || null,
        })

      if (error) throw error

      // Reset form and close modal
      setCageCode('')
      setLabel('')
      setStatus('empty')
      setNotes('')
      setIsOpen(false)

      // Refresh the page to show new cage
      router.refresh()
    } catch (error) {
      console.error('Error adding cage:', error)
      // In a real app, you'd show a toast notification here
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false)
      // Reset form when closing
      setCageCode('')
      setLabel('')
      setStatus('empty')
      setNotes('')
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
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleClose}
          />

          {/* Modal Card */}
          <div
            className="relative bg-white rounded-xl shadow-lg w-full mx-4"
            style={{ maxWidth: '480px', padding: '24px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-medium text-xl" style={{ color: '#1A1A2E' }}>
                Add New Cage
              </h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cage Code */}
              <div>
                <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
                  Cage Code *
                </label>
                <input
                  type="text"
                  value={cageCode}
                  onChange={(e) => setCageCode(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#1A1A2E'
                  }}
                  placeholder="e.g., C001, A-12, etc."
                  required
                />
              </div>

              {/* Label */}
              <div>
                <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
                  Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#1A1A2E'
                  }}
                  placeholder="Optional descriptive label"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'empty' | 'quarantine' | 'retired')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#1A1A2E'
                  }}
                >
                  <option value="empty">Empty</option>
                  <option value="active">Active</option>
                  <option value="quarantine">Quarantine</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#1A1A2E'
                  }}
                  placeholder="Optional notes about this cage"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg font-body font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: '#F8FAFB',
                    color: '#6B7280',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !cageCode.trim()}
                  className="px-4 py-2 rounded-lg font-body font-medium text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ backgroundColor: '#1A7F64' }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Cage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}