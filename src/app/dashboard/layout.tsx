import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import DynamicTopbar from '@/components/dynamic-topbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFB' }}>
      {/* Slim Sidebar */}
      <Sidebar user={user} />

      {/* Main content area with topbar */}
      <div className="pl-16 flex flex-col min-h-screen">
        {/* Top bar */}
        <DynamicTopbar />

        {/* Main content */}
        <main className="flex-1" style={{ backgroundColor: '#F8FAFB' }}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}