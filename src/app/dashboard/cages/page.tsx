import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveLabId } from '@/lib/supabase/lab'
import { LayoutGrid, Plus } from 'lucide-react'
import AddCageModal from '@/components/cages/add-cage-modal'

export default async function CagesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Scope to the active lab. Without this filter, multi-lab users would
  // see cages from every lab they're a member of (RLS grants read access
  // to any lab_membership).
  const labId = await getActiveLabId(supabase)
  const { data: cages } = labId
    ? await supabase
        .from('cages')
        .select('*')
        .eq('lab_id', labId)
        .order('created_at', { ascending: false })
    : { data: [] as any[] }

  // Get relative time
  const getRelativeTime = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffTime = now.getTime() - past.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1 day ago'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return `${Math.ceil(diffDays / 30)} months ago`
  }

  return (
    <div className="pt-2">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search cages..."
            className="px-3 py-2 border rounded-lg font-body placeholder-gray-500 focus:outline-none focus:border-[#1A7F64] focus:ring-2 focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              fontSize: '14px',
              minWidth: '240px',
              color: '#1A1A2E'
            }}
          />
        </div>
        <AddCageModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Cage
          </button>
        </AddCageModal>
      </div>

      {/* Table or Empty State */}
      {!cages || cages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <LayoutGrid
            style={{ color: '#1A7F64', width: '40px', height: '40px' }}
            className="mb-4"
          />
          <h3
            className="font-display font-medium mb-2"
            style={{
              color: '#1A1A2E',
              fontSize: '16px'
            }}
          >
            No cages yet
          </h3>
          <p
            className="font-body text-center mb-6 max-w-sm"
            style={{
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            Add your first cage to start tracking your colony
          </p>
          <AddCageModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Cage
            </button>
          </AddCageModal>
        </div>
      ) : (
        <div className="bg-white rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: '#F8FAFB' }}>
              <tr>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Cage Code
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Label
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Notes
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {cages.map((cage) => (
                <tr
                  key={cage.id}
                  className="border-b"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <td className="px-6 py-4">
                    <span
                      className="font-mono"
                      style={{
                        color: '#1A1A2E',
                        fontSize: '14px'
                      }}
                    >
                      {cage.cage_code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-body"
                      style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}
                    >
                      {cage.label || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 rounded-full font-body text-xs"
                      style={{
                        backgroundColor: cage.status === 'active' ? '#E8F5F1' : '#F3F4F6',
                        color: cage.status === 'active' ? '#1A7F64' : '#6B7280'
                      }}
                    >
                      {cage.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-body"
                      style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}
                    >
                      {cage.notes ? cage.notes.substring(0, 40) + (cage.notes.length > 40 ? '...' : '') : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-body"
                      style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}
                    >
                      {getRelativeTime(cage.created_at)}
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