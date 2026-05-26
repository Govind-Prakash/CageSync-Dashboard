'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Flag, Heart, AlertTriangle, X, CheckCircle, Clock, ExternalLink } from 'lucide-react'

interface NotificationsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type NotificationType = 'flag' | 'wean' | 'system' | 'humane'

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  description: string
  time: string
  isUnread: boolean
}

const sampleNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'flag',
    title: 'Cage B-204 flagged',
    description: 'Facility vet noted animal appears lethargic. Please review.',
    time: '2 minutes ago',
    isUnread: true,
  },
  {
    id: '2',
    type: 'wean',
    title: 'Wean date tomorrow',
    description: 'Litter in Cage A-107 is due for weaning on May 27',
    time: '1 hour ago',
    isUnread: true,
  },
  {
    id: '3',
    type: 'system',
    title: 'Team member joined',
    description: 'Dr. Sarah Cohen accepted your invitation to CageSync',
    time: 'Yesterday',
    isUnread: false,
  },
  {
    id: '4',
    type: 'humane',
    title: 'Humane endpoint approaching',
    description: 'Mouse #M-0234 weight loss >20%. Immediate review required.',
    time: '2 hours ago',
    isUnread: true,
  },
]

export default function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'flags' | 'system'>('all')
  const [notifications, setNotifications] = useState(sampleNotifications)
  const panelRef = useRef<HTMLDivElement>(null)

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })))
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, isUnread: false } : n
    ))
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const snoozeNotification = (id: string) => {
    // Placeholder for snooze functionality
    console.log('Snooze notification:', id)
  }

  const navigateToNotification = (id: string) => {
    // Placeholder for navigation functionality
    console.log('Navigate to notification:', id)
  }

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => n.isUnread)
      case 'flags':
        return notifications.filter(n => n.type === 'flag' || n.type === 'humane')
      case 'system':
        return notifications.filter(n => n.type === 'system')
      default:
        return notifications
    }
  }

  const getIconComponent = (type: NotificationType) => {
    switch (type) {
      case 'flag':
        return <Flag className="w-4 h-4" style={{ color: '#E53E3E' }} />
      case 'wean':
        return <Heart className="w-4 h-4" style={{ color: '#854F0B' }} />
      case 'system':
        return <Bell className="w-4 h-4" style={{ color: '#1A7F64' }} />
      case 'humane':
        return <AlertTriangle className="w-4 h-4" style={{ color: '#E53E3E' }} />
      default:
        return null
    }
  }

  const getIconBackground = (type: NotificationType) => {
    switch (type) {
      case 'flag':
      case 'humane':
        return '#FCEBEB'
      case 'wean':
        return '#FEF3D8'
      case 'system':
        return '#E8F5F1'
      default:
        return '#F9FAFB'
    }
  }

  const filteredNotifications = getFilteredNotifications()
  const hasUnread = notifications.some(n => n.isUnread)

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-12 right-0 w-96 bg-white border rounded-xl shadow-xl z-50 overflow-hidden"
      style={{
        borderColor: '#E2E8F0',
        maxHeight: '520px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: '#E2E8F0' }}
      >
        <h2 className="font-display font-medium" style={{ fontSize: '15px', color: '#1A1A2E' }}>
          Notifications
        </h2>
        <div className="flex items-center space-x-3">
          {hasUnread && (
            <button
              onClick={markAllAsRead}
              className="text-xs hover:text-primary transition-colors"
              style={{ color: '#6B7280', fontSize: '12px' }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#E2E8F0' }}>
        {['all', 'unread', 'flags', 'system'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`flex-1 py-2.5 px-4 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 text-primary'
                : 'text-gray-500 hover:text-primary'
            }`}
            style={{
              fontSize: '13px',
              borderColor: activeTab === tab ? '#1A7F64' : 'transparent',
              color: activeTab === tab ? '#1A7F64' : '#6B7280',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification Items */}
      <div className="max-h-80 overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="group px-4 py-3 border-b hover:bg-gray-25 transition-colors flex items-start space-x-3 relative"
              style={{ borderColor: '#F9FAFB' }}
            >
              {/* Unread dot positioned at far left of icon */}
              {notification.isUnread && (
                <div
                  className="absolute left-1 top-4 w-0.5 h-0.5 rounded-full"
                  style={{ backgroundColor: '#1A7F64' }}
                />
              )}

              {/* Icon */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: getIconBackground(notification.type) }}
              >
                {getIconComponent(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium line-clamp-1"
                  style={{ fontSize: '13px', color: '#1A1A2E' }}
                >
                  {notification.title}
                </h3>
                <p
                  className="mt-0.5 line-clamp-2"
                  style={{ fontSize: '12px', color: '#6B7280' }}
                >
                  {notification.description}
                </p>
                <p
                  className="mt-1"
                  style={{ fontSize: '11px', color: '#9CA3AF' }}
                >
                  {notification.time}
                </p>
              </div>

              {/* Action buttons (shown on hover) */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {notification.isUnread && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    title="Mark as read"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <CheckCircle className="w-3 h-3 hover:text-primary transition-colors" style={{ color: '#6B7280' }} />
                  </button>
                )}

                <button
                  onClick={() => snoozeNotification(notification.id)}
                  className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Snooze"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <Clock className="w-3 h-3 hover:text-amber transition-colors" style={{ color: '#6B7280' }} />
                </button>

                <button
                  onClick={() => navigateToNotification(notification.id)}
                  className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Go to"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <ExternalLink className="w-3 h-3 hover:text-gray-600 transition-colors" style={{ color: '#6B7280' }} />
                </button>

                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                  title="Dismiss"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <X className="w-3 h-3 hover:text-red-500 transition-colors" style={{ color: '#6B7280' }} />
                </button>
              </div>
            </div>
          ))
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center h-40 text-center px-4">
            <Bell className="w-8 h-8 mb-3" style={{ color: '#9CA3AF' }} />
            <h3
              className="font-medium mb-1"
              style={{ fontSize: '14px', color: '#1A1A2E' }}
            >
              All caught up
            </h3>
            <p
              style={{ fontSize: '12px', color: '#6B7280' }}
            >
              No new notifications
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 border-t text-center"
        style={{ borderColor: '#E2E8F0' }}
      >
        <button
          className="text-primary hover:underline transition-colors"
          style={{ fontSize: '13px', color: '#1A7F64' }}
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}