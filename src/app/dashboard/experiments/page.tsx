import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlaskConical, Plus } from 'lucide-react'
import AddExperimentModal from '@/components/experiments/add-experiment-modal'

export default async function ExperimentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: experiments } = await supabase
    .from('experiments')
    .select('*')
    .order('created_at', { ascending: false })

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

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="pt-2">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search experiments..."
            className="px-3 py-2 border rounded-lg font-body placeholder-gray-500 focus:outline-none focus:border-[#1A7F64] focus:ring-2 focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              fontSize: '14px',
              minWidth: '240px',
              color: '#1A1A2E'
            }}
          />
        </div>
        <AddExperimentModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Experiment
          </button>
        </AddExperimentModal>
      </div>

      {/* Table or Empty State */}
      {!experiments || experiments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FlaskConical
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
            No experiments yet
          </h3>
          <p
            className="font-body text-center mb-6 max-w-sm"
            style={{
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            Create your first experiment to start tracking protocols
          </p>
          <AddExperimentModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Experiment
            </button>
          </AddExperimentModal>
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
                  Name
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  IACUC Number
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
                  Start Date
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  End Date
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
              {experiments.map((experiment) => (
                <tr
                  key={experiment.id}
                  className="border-b"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <td className="px-6 py-4">
                    <span
                      className="font-display font-medium"
                      style={{
                        color: '#1A1A2E',
                        fontSize: '14px'
                      }}
                    >
                      {experiment.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-mono"
                      style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}
                    >
                      {experiment.iacuc_number || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 rounded-full font-body text-xs"
                      style={{
                        backgroundColor:
                          experiment.status === 'active' ? '#E8F5F1' :
                          experiment.status === 'completed' ? '#F3F4F6' :
                          experiment.status === 'paused' ? '#FEF3D8' : '#F3F4F6',
                        color:
                          experiment.status === 'active' ? '#1A7F64' :
                          experiment.status === 'completed' ? '#6B7280' :
                          experiment.status === 'paused' ? '#854F0B' : '#6B7280'
                      }}
                    >
                      {experiment.status || 'active'}
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
                      {experiment.start_date ? formatDate(experiment.start_date) : '-'}
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
                      {experiment.end_date ? formatDate(experiment.end_date) : '-'}
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
                      {getRelativeTime(experiment.created_at)}
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