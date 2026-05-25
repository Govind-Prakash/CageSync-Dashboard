import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Syringe, Plus } from 'lucide-react'
import AddTreatmentModal from '@/components/treatments/add-treatment-modal'

export default async function TreatmentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: treatments } = await supabase
    .from('treatments')
    .select('*, animals(animal_code)')
    .order('administered_at', { ascending: false })

  // Format date and time
  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="pt-2">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search treatments..."
            className="px-3 py-2 border rounded-lg font-body placeholder-gray-500 focus:outline-none focus:border-[#1A7F64] focus:ring-2 focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              fontSize: '14px',
              minWidth: '240px',
              color: '#1A1A2E'
            }}
          />
        </div>
        <AddTreatmentModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Treatment
          </button>
        </AddTreatmentModal>
      </div>

      {/* Table or Empty State */}
      {!treatments || treatments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Syringe
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
            No treatments recorded
          </h3>
          <p
            className="font-body text-center mb-6 max-w-sm"
            style={{
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            Log treatments for your animals
          </p>
          <AddTreatmentModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Treatment
            </button>
          </AddTreatmentModal>
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
                  Animal
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Treatment Type
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Substance
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Dose
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Route
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Administered At
                </th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((treatment) => (
                <tr
                  key={treatment.id}
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
                      {treatment.animals?.animal_code || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-body"
                      style={{
                        color: '#1A1A2E',
                        fontSize: '14px'
                      }}
                    >
                      {treatment.treatment_type}
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
                      {treatment.substance || '-'}
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
                      {treatment.dose || '-'}
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
                      {treatment.route || '-'}
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
                      {treatment.administered_at ? formatDateTime(treatment.administered_at) : '-'}
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