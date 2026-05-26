'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Calendar, CheckSquare, CloudOff, RefreshCw, CheckCircle } from 'lucide-react'
import NotificationsPanel from './notifications-panel'
import TasksPanel from './tasks-panel'
import CalendarPanel from './calendar-panel'

interface TopbarProps {
  currentPageTitle: string
  onToastShow?: (variant: 'success' | 'error', title: string, message: string) => void
}

type SyncState = 'disconnected' | 'idle' | 'syncing' | 'synced'

export default function Topbar({ currentPageTitle, onToastShow }: TopbarProps) {
  const router = useRouter()
  const [syncState, setSyncState] = useState<SyncState>('disconnected')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleNotificationsToggle = () => {
    setNotificationsOpen(!notificationsOpen)
    if (tasksOpen) setTasksOpen(false) // Close tasks if open
    if (calendarOpen) setCalendarOpen(false) // Close calendar if open
  }

  const handleTasksToggle = () => {
    setTasksOpen(!tasksOpen)
    if (notificationsOpen) setNotificationsOpen(false) // Close notifications if open
    if (calendarOpen) setCalendarOpen(false) // Close calendar if open
  }

  const handleCalendarToggle = () => {
    setCalendarOpen(!calendarOpen)
    if (notificationsOpen) setNotificationsOpen(false) // Close notifications if open
    if (tasksOpen) setTasksOpen(false) // Close tasks if open
  }

  const handleSyncClick = () => {
    if (syncState === 'disconnected') {
      router.push('/dashboard/settings')
      return
    }

    if (syncState === 'idle') {
      setSyncState('syncing')

      // Simulate sync process
      setTimeout(() => {
        setSyncState('synced')
        onToastShow?.('success', 'Synced to Google Sheets', 'Records updated successfully')

        // Auto return to idle after 3 seconds
        setTimeout(() => {
          setSyncState('idle')
        }, 3000)
      }, 2000)
    }
  }

  const renderSyncButton = () => {
    switch (syncState) {
      case 'disconnected':
        return (
          <button
            onClick={handleSyncClick}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Connect Google Sheets in Settings → Integrations"
          >
            <CloudOff className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </button>
        )

      case 'idle':
        return (
          <button
            onClick={handleSyncClick}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Sync to Google Sheets"
          >
            <RefreshCw className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </button>
        )

      case 'syncing':
        return (
          <button
            disabled
            className="p-1 rounded cursor-not-allowed"
            title="Syncing..."
          >
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: '#9CA3AF' }} />
          </button>
        )

      case 'synced':
        return (
          <button
            onClick={handleSyncClick}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Synced successfully"
          >
            <CheckCircle className="w-5 h-5" style={{ color: '#1A7F64' }} />
          </button>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="relative h-14 w-full flex items-center justify-between px-6 border-b"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      {/* Left side - Page Title only */}
      <div className="flex items-center">
        <h1 className="font-display font-medium text-lg" style={{ color: '#1A1A2E' }}>
          {currentPageTitle}
        </h1>
      </div>

      {/* Right side - Sync, Tasks, Calendar, Notifications */}
      <div className="flex items-center space-x-4">
        {/* Sync Button */}
        <div className="relative">
          {renderSyncButton()}
        </div>

        {/* CheckSquare with Red Badge */}
        <div className="relative">
          <button
            onClick={handleTasksToggle}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Tasks & Reminders"
          >
            <CheckSquare className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            <div
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: '#E53E3E', fontSize: '10px' }}
            >
              2
            </div>
          </button>

          <TasksPanel
            isOpen={tasksOpen}
            onClose={() => setTasksOpen(false)}
          />
        </div>

        {/* Colony Calendar */}
        <div className="relative">
          <button
            onClick={handleCalendarToggle}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Colony Calendar"
          >
            <Calendar className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </button>

          <CalendarPanel
            isOpen={calendarOpen}
            onClose={() => setCalendarOpen(false)}
          />
        </div>

        {/* Notification Bell with Red Badge */}
        <div className="relative">
          <button
            onClick={handleNotificationsToggle}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" style={{ color: '#9CA3AF', transform: 'translateY(0.5px)' }} />
            {!notificationsOpen && (
              <div
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: '#E53E3E', fontSize: '10px' }}
              >
                3
              </div>
            )}
          </button>

          <NotificationsPanel
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>

      </div>
    </div>
  )
}