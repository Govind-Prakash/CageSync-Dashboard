'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface AddExperimentModalProps {
  children: React.ReactNode
}

export default function AddExperimentModal({ children }: AddExperimentModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-xl w-full mx-4" style={{ maxWidth: '480px', padding: '24px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '16px' }}>
                Add New Experiment
              </h2>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            </div>
            <p style={{ color: '#6B7280' }}>Modal implementation coming soon...</p>
          </div>
        </div>
      )}
    </>
  )
}