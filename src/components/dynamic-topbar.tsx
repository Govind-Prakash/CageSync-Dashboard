'use client'

import { usePathname } from 'next/navigation'
import Topbar from './topbar'

interface DynamicTopbarProps {
  userEmail: string
}

const getPageTitle = (pathname: string): string => {
  const pathMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/cages': 'Cages',
    '/dashboard/animals': 'Animals',
    '/dashboard/experiments': 'Experiments',
    '/dashboard/treatments': 'Treatments',
    '/dashboard/breeding': 'Breeding',
    '/dashboard/team': 'Team',
    '/dashboard/settings': 'Settings',
  }

  return pathMap[pathname] || 'Dashboard'
}

export default function DynamicTopbar({ userEmail }: DynamicTopbarProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <Topbar
      currentPageTitle={pageTitle}
      userEmail={userEmail}
    />
  )
}