'use client'

import { useEffect } from 'react'

interface ToastProps {
  variant: 'success' | 'error'
  title: string
  message: string
  isVisible: boolean
  onDismiss: () => void
}

export default function Toast({ variant, title, message, isVisible, onDismiss }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onDismiss()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onDismiss])

  if (!isVisible) return null

  const borderColor = variant === 'success' ? '#1A7F64' : '#E53E3E'
  const titleColor = variant === 'success' ? '#1A1A2E' : '#A32D2D'
  const icon = variant === 'success' ? '✓' : '✕'

  return (
    <div
      className={`fixed transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{
        bottom: '24px',
        right: '24px',
        zIndex: 50
      }}
    >
      <div
        className="rounded-lg shadow-md font-body"
        style={{
          backgroundColor: 'white',
          borderLeft: `4px solid ${borderColor}`,
          padding: '12px 16px',
          width: '280px'
        }}
      >
        <div className="flex items-center" style={{ marginBottom: '4px' }}>
          <span style={{ color: titleColor, fontSize: '14px', fontWeight: 500 }}>
            {icon} {title}
          </span>
        </div>
        <div style={{ color: '#6B7280', fontSize: '12px' }}>
          {message}
        </div>
      </div>
    </div>
  )
}