import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Rabbit, Plus } from 'lucide-react'
import AddAnimalModal from '@/components/animals/add-animal-modal'

export default async function AnimalsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: animals } = await supabase
    .from('animals')
    .select('*, cages(cage_code, label)')
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
            placeholder="Search animals..."
            className="px-3 py-2 border rounded-lg font-body placeholder-gray-500 focus:outline-none focus:border-[#1A7F64] focus:ring-2 focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              fontSize: '14px',
              minWidth: '240px',
              color: '#1A1A2E'
            }}
          />
        </div>
        <AddAnimalModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Animal
          </button>
        </AddAnimalModal>
      </div>

      {/* Table or Empty State */}
      {!animals || animals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Rabbit
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
            No animals yet
          </h3>
          <p
            className="font-body text-center mb-6 max-w-sm"
            style={{
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            Add animals after setting up cages
          </p>
          <AddAnimalModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Animal
            </button>
          </AddAnimalModal>
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
                  Animal Code
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Species/Strain
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Sex
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Cage
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
                  DOB
                </th>
              </tr>
            </thead>
            <tbody>
              {animals.map((animal) => (
                <tr
                  key={animal.id}
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
                      {animal.animal_code}
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
                      {animal.species && animal.strain ? `${animal.species} - ${animal.strain}` : animal.species || animal.strain || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 rounded-full font-body text-xs"
                      style={{
                        backgroundColor:
                          animal.sex === 'male' ? '#E8F5F1' :
                          animal.sex === 'female' ? '#FEF3D8' : '#F3F4F6',
                        color:
                          animal.sex === 'male' ? '#1A7F64' :
                          animal.sex === 'female' ? '#854F0B' : '#6B7280'
                      }}
                    >
                      {animal.sex || 'unknown'}
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
                      {animal.cages?.cage_code || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-2 py-1 rounded-full font-body text-xs"
                      style={{
                        backgroundColor:
                          animal.status === 'alive' ? '#E8F5F1' :
                          animal.status === 'deceased' ? '#F3F4F6' :
                          animal.status === 'sacrificed' ? '#FCEBEB' :
                          animal.status === 'transferred' ? '#FEF3D8' : '#F3F4F6',
                        color:
                          animal.status === 'alive' ? '#1A7F64' :
                          animal.status === 'deceased' ? '#6B7280' :
                          animal.status === 'sacrificed' ? '#A32D2D' :
                          animal.status === 'transferred' ? '#854F0B' : '#6B7280'
                      }}
                    >
                      {animal.status || 'alive'}
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
                      {animal.date_of_birth ? formatDate(animal.date_of_birth) : '-'}
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