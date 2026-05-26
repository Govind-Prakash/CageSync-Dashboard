'use client'

import { usePathname } from 'next/navigation'
import Topbar from './topbar'

const getPageTitle = (pathname: string): string => {
  const pathMap: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/cages': 'Cages',
    '/dashboard/animals': 'Animals',
    '/dashboard/experiments': 'Experiments',
    '/dashboard/treatments': 'Treatments',
    '/dashboard/tools': 'Lab Tools',
    '/dashboard/breeding': 'Breeding',
    '/dashboard/team': 'Team',
    '/dashboard/settings': 'Settings',
  }

  // Handle tools sub-routes
  if (pathname.startsWith('/dashboard/tools/')) {
    return 'Lab Tools'
  }

  return pathMap[pathname] || 'Dashboard'
}

export default function DynamicTopbar() {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <Topbar
      currentPageTitle={pageTitle}
    />
  )
}