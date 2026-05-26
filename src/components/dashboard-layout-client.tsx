'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import DynamicTopbar from '@/components/dynamic-topbar'
import Toast from '@/components/toast'

interface DashboardLayoutClientProps {
  user: any
  children: React.ReactNode
}

interface ToastState {
  isVisible: boolean
  variant: 'success' | 'error'
  title: string
  message: string
}

export default function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    variant: 'success',
    title: '',
    message: ''
  })

  const showToast = (variant: 'success' | 'error', title: string, message: string) => {
    setToast({
      isVisible: true,
      variant,
      title,
      message
    })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFB' }}>
      {/* Slim Sidebar */}
      <Sidebar user={user} />

      {/* Main content area with topbar */}
      <div className="pl-16 flex flex-col min-h-screen">
        {/* Top bar */}
        <DynamicTopbar onToastShow={showToast} />

        {/* Main content */}
        <main className="flex-1" style={{ backgroundColor: '#F8FAFB' }}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <Toast
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        isVisible={toast.isVisible}
        onDismiss={hideToast}
      />
    </div>
  )
}