'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Calendar, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TopbarProps {
  currentPageTitle: string
  userEmail: string
}

export default function Topbar({ currentPageTitle, userEmail }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div
      className="h-14 w-full flex items-center justify-between px-6 border-b"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      {/* Left side - Page Title only */}
      <div className="flex items-center">
        <h1 className="font-display font-medium text-lg" style={{ color: '#1A1A2E' }}>
          {currentPageTitle}
        </h1>
      </div>

      {/* Right side - Tasks, Calendar, Notifications, User, Sign Out */}
      <div className="flex items-center space-x-5">
        {/* CheckSquare with Red Badge */}
        <div className="relative">
          <CheckSquare className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          <div
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: '#E53E3E', fontSize: '10px' }}
          >
            2
          </div>
        </div>

        {/* Calendar */}
        <Calendar className="w-5 h-5" style={{ color: '#9CA3AF' }} />

        {/* Notification Bell with Red Badge */}
        <div className="relative">
          <Bell className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          <div
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: '#E53E3E', fontSize: '10px' }}
          >
            3
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6" style={{ backgroundColor: '#E2E8F0' }}></div>

        {/* User Email */}
        <span className="font-body text-sm" style={{ color: '#6B7280' }}>
          {userEmail}
        </span>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Sign out"
        >
          {isSigningOut ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          ) : (
            <LogOut className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          )}
        </button>
      </div>
    </div>
  )
}