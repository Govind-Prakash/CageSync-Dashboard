'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Archive,
  Rabbit,
  FlaskConical,
  Stethoscope,
  Heart,
  Users,
  Settings
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
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
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
        <div className="flex-shrink-0 p-2">
          <div className="flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: '#1A7F64' }}
            >
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}