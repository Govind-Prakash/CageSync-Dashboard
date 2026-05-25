import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'

export default async function Dashboard() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display font-semibold text-3xl text-ink">
                Welcome to CageSync
              </h1>
              <p className="font-body text-gray-500 mt-2">
                Lab animal colony management dashboard
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-8">
          <h2 className="font-display font-medium text-xl text-ink mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block font-body font-medium text-sm text-ink mb-1">
                Email
              </label>
              <p className="font-mono text-sm text-gray-500 bg-surface px-3 py-2 rounded-lg border">
                {user.email}
              </p>
            </div>
            <div>
              <label className="block font-body font-medium text-sm text-ink mb-1">
                User ID
              </label>
              <p className="font-mono text-sm text-gray-500 bg-surface px-3 py-2 rounded-lg border">
                {user.id}
              </p>
            </div>
            <div>
              <label className="block font-body font-medium text-sm text-ink mb-1">
                Last Sign In
              </label>
              <p className="font-mono text-sm text-gray-500 bg-surface px-3 py-2 rounded-lg border">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h2 className="font-display font-medium text-xl text-ink mb-4">
            Getting Started
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-primary-surface rounded-lg p-4">
              <h3 className="font-body font-medium text-primary-dark mb-2">
                Setup Your Lab
              </h3>
              <p className="font-body text-sm text-gray-500">
                Configure your laboratory settings and invite team members.
              </p>
            </div>
            <div className="bg-amber-surface rounded-lg p-4">
              <h3 className="font-body font-medium text-amber-dark mb-2">
                Manage Colonies
              </h3>
              <p className="font-body text-sm text-gray-500">
                Track your animal colonies, breeding pairs, and experiments.
              </p>
            </div>
            <div className="bg-surface rounded-lg p-4 border border-border">
              <h3 className="font-body font-medium text-ink mb-2">
                Mobile App
              </h3>
              <p className="font-body text-sm text-gray-500">
                Download the CageSync mobile app for QR scanning and logging.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}