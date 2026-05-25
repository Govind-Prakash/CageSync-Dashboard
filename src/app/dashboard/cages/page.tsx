import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Archive, Plus } from 'lucide-react'
import AddCageModal from '@/components/cages/add-cage-modal'

type Cage = {
  id: string
  cage_code: string
  label?: string
  status: 'active' | 'empty' | 'quarantine' | 'retired'
  room?: string
  notes?: string
  created_at: string
}

export default async function CagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Note: The cages table SQL will be run separately, just building UI assuming table exists
  const { data: cages } = await supabase
    .from('cages')
    .select('*')
    .order('created_at', { ascending: false })

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { backgroundColor: '#E8F5F1', color: '#1A7F64' },
      empty: { backgroundColor: '#F8FAFB', color: '#6B7280' },
      quarantine: { backgroundColor: '#FEF3D8', color: '#854F0B' },
      retired: { backgroundColor: '#FCEBEB', color: '#A32D2D' },
    }

    return (
      <span
        className="px-2 py-1 rounded-lg text-xs font-medium uppercase"
        style={styles[status as keyof typeof styles] || styles.empty}
      >
        {status}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-end mb-6">
        <AddCageModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium text-sm text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1A7F64' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Cage
          </button>
        </AddCageModal>
      </div>

      {/* Content */}
      {!cages || cages.length === 0 ? (
        // Empty State
        <div
          className="rounded-xl p-12 shadow-sm text-center"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#F8FAFB' }}
            >
              <Archive className="w-8 h-8" style={{ color: '#1A7F64' }} />
            </div>
          </div>

          <h3 className="font-display font-medium text-xl mb-2" style={{ color: '#1A1A2E' }}>
            No cages yet
          </h3>

          <p className="font-body text-sm mb-6" style={{ color: '#6B7280' }}>
            Add your first cage to start tracking your colony
          </p>

          <AddCageModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium text-sm text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#1A7F64' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Cage
            </button>
          </AddCageModal>
        </div>
      ) : (
        // Cages Table
        <div
          className="rounded-xl shadow-sm overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
        >
          <table className="w-full">
            {/* Table Header */}
            <thead style={{ backgroundColor: '#F8FAFB' }}>
              <tr>
                <th className="px-6 py-3 text-left">
                  <span className="font-body font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Cage Code
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-body font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Label
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-body font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Status
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-body font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Room
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-body font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Notes
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="font-body font-medium text-xs uppercase tracking-wide" style={{ color: '#6B7280' }}>
                    Created At
                  </span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {cages.map((cage, index) => (
                <tr
                  key={cage.id}
                  className={index !== cages.length - 1 ? 'border-b' : ''}
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm" style={{ color: '#1A1A2E' }}>
                      {cage.cage_code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-body text-sm" style={{ color: '#1A1A2E' }}>
                      {cage.label || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(cage.status)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-body text-sm" style={{ color: '#1A1A2E' }}>
                      {cage.room || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-body text-sm" style={{ color: '#1A1A2E' }}>
                      {cage.notes || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-body text-sm" style={{ color: '#6B7280' }}>
                      {formatDate(cage.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}