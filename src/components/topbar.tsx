'use client'

import { Bell, Calendar, CheckSquare } from 'lucide-react'

interface TopbarProps {
  currentPageTitle: string
}

export default function Topbar({ currentPageTitle }: TopbarProps) {
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

      {/* Right side - Tasks, Calendar, Notifications */}
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

      </div>
    </div>
  )
}