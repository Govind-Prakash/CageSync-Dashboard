'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart3,
  Archive,
  Rabbit,
  FlaskConical,
  Stethoscope,
  Heart,
  Users,
  Settings,
  Building2,
  Download,
  HelpCircle,
  UserPlus,
  LogOut,
  ChevronRight
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Cages', href: '/dashboard/cages', icon: Archive },
  { name: 'Animals', href: '/dashboard/animals', icon: Rabbit },
  { name: 'Experiments', href: '/dashboard/experiments', icon: FlaskConical },
  { name: 'Treatments', href: '/dashboard/treatments', icon: Stethoscope },
  { name: 'Breeding', href: '/dashboard/breeding', icon: Heart },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  user: {
    email?: string
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Get user initials from email
  const getUserInitials = (email: string): string => {
    if (!email) return 'GP'
    const name = email.split('@')[0]
    const parts = name.split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Get full name from email (for display)
  const getDisplayName = (email: string): string => {
    if (!email) return 'Govind Prakash'
    const name = email.split('@')[0]
    const parts = name.split(/[._-]/)
    if (parts.length >= 2) {
      return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
    }
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileMenu])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div
      className="flex h-full w-16 flex-col fixed inset-y-0 z-50"
      style={{ backgroundColor: '#0D1F1A' }}
    >
      <div className="flex flex-1 flex-col min-h-0">
        {/* Logo */}
        <div className="flex items-center justify-center py-4">
          <Link href="/dashboard" className="flex items-center justify-center">
            <Image
              src="/images/logo-removedbg.png"
              alt="CageSync"
              width={36}
              height={36}
              className="cursor-pointer"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <div key={item.name} className="relative group">
                <Link
                  href={item.href}
                  className={`flex items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'hover:bg-gray-800'
                  }`}
                  style={isActive ? { backgroundColor: '#1A7F64' } : {}}
                >
                  <div
                    style={!isActive ? { color: '#9CA3AF' } : { color: 'white' }}
                    className="group-hover:text-white"
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </Link>

                {/* Tooltip */}
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User Avatar */}
        <div className="flex-shrink-0 px-2" style={{ paddingTop: '16px', paddingBottom: '20px' }}>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-display font-semibold hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: '#1A7F64',
                fontSize: '12px'
              }}
            >
              {getUserInitials(user.email || '')}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Menu Popup */}
      {showProfileMenu && (
        <div
          ref={profileMenuRef}
          className="fixed"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            width: '240px',
            left: '64px',
            bottom: '32px',
            zIndex: 60
          }}
        >
          {/* Header section with user info */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #F3F4F6',
            background: 'linear-gradient(135deg, #085041 0%, #1A7F64 50%, #25A882 100%)',
            borderRadius: '12px 12px 0 0'
          }}>
            <div className="flex items-center space-x-3">
              <div
                className="rounded-full flex items-center justify-center font-display font-semibold"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#1A7F64',
                  width: '48px',
                  height: '48px',
                  fontSize: '18px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                {getUserInitials(user.email || '')}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-display truncate"
                  style={{
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {getDisplayName(user.email || '')}
                </div>
                <div
                  className="font-body truncate"
                  style={{
                    color: '#E8F5F1',
                    fontSize: '12px',
                    fontWeight: 400
                  }}
                >
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div>
            <button
              className="w-full flex items-center justify-between font-body transition-colors hover:cursor-pointer"
              style={{
                color: '#374151',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div className="flex items-center">
                <Settings style={{ width: '15px', height: '15px', marginRight: '12px', color: '#9CA3AF' }} />
                Settings
              </div>
              <ChevronRight style={{ width: '15px', height: '15px', color: '#D1D5DB' }} />
            </button>

            <button
              className="w-full flex items-center justify-between font-body transition-colors hover:cursor-pointer"
              style={{
                color: '#374151',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div className="flex items-center">
                <Building2 style={{ width: '15px', height: '15px', marginRight: '12px', color: '#9CA3AF' }} />
                Lab Profile
              </div>
              <ChevronRight style={{ width: '15px', height: '15px', color: '#D1D5DB' }} />
            </button>

            <button
              className="w-full flex items-center font-body transition-colors hover:cursor-pointer"
              style={{
                color: '#374151',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Download style={{ width: '15px', height: '15px', marginRight: '12px', color: '#9CA3AF' }} />
              Data Export
            </button>

            <button
              className="w-full flex items-center justify-between font-body transition-colors hover:cursor-pointer"
              style={{
                color: '#374151',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div className="flex items-center">
                <HelpCircle style={{ width: '15px', height: '15px', marginRight: '12px', color: '#9CA3AF' }} />
                Help
              </div>
              <ChevronRight style={{ width: '15px', height: '15px', color: '#D1D5DB' }} />
            </button>

            {/* Divider */}
            <div style={{ margin: '4px 0', borderTop: '1px solid #F3F4F6' }}></div>

            <button
              className="w-full flex items-center font-body transition-colors hover:cursor-pointer"
              style={{
                color: '#1A7F64',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <UserPlus style={{ width: '15px', height: '15px', marginRight: '12px', color: '#1A7F64' }} />
              Invite Team Member
            </button>

            {/* Divider */}
            <div style={{ margin: '4px 0', borderTop: '1px solid #F3F4F6' }}></div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center font-body transition-colors hover:cursor-pointer"
              style={{
                color: '#E53E3E',
                backgroundColor: 'transparent',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 400
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <LogOut style={{ width: '15px', height: '15px', marginRight: '12px', color: '#E53E3E' }} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}