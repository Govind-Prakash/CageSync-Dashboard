import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Heart, Plus } from 'lucide-react'
import AddBreedingPairModal from '@/components/breeding/add-breeding-pair-modal'

export default async function BreedingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: pairs } = await supabase
    .from('breeding_pairs')
    .select('*, cages(cage_code), male:animals!male_id(animal_code), female:animals!female_id(animal_code)')
    .order('created_at', { ascending: false })

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate expected litter date
  const getExpectedLitter = (pairedOn: string) => {
    const pairedDate = new Date(pairedOn)
    const expectedDate = new Date(pairedDate)
    expectedDate.setDate(pairedDate.getDate() + 20)
    return expectedDate
  }

  // Calculate wean date
  const getWeanDate = (litterBornOn: string | null) => {
    if (!litterBornOn) return null
    const bornDate = new Date(litterBornOn)
    const weanDate = new Date(bornDate)
    weanDate.setDate(bornDate.getDate() + 21)
    return weanDate
  }

  // Check if date is within 3 days
  const isWithin3Days = (date: Date) => {
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 3 && diffDays >= 0
  }

  return (
    <div className="pt-2">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search breeding pairs..."
            className="px-3 py-2 border rounded-lg font-body placeholder-gray-500 focus:outline-none focus:border-[#1A7F64] focus:ring-2 focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              fontSize: '14px',
              minWidth: '240px',
              color: '#1A1A2E'
            }}
          />
        </div>
        <AddBreedingPairModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pair
          </button>
        </AddBreedingPairModal>
      </div>

      {/* Table or Empty State */}
      {!pairs || pairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Heart
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
            No breeding pairs
          </h3>
          <p
            className="font-body text-center mb-6 max-w-sm"
            style={{
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            Set up breeding pairs to track your colony reproduction
          </p>
          <AddBreedingPairModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pair
            </button>
          </AddBreedingPairModal>
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
                  Cage
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Male ID
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Female ID
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Paired On
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Expected Litter
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Wean Date
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Litter Size
                </th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair) => {
                const expectedLitter = getExpectedLitter(pair.paired_on)
                const weanDate = getWeanDate(pair.litter_born_on)
                const isLitterSoon = isWithin3Days(expectedLitter)

                return (
                  <tr
                    key={pair.id}
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
                        {pair.cages?.cage_code || '-'}
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
                        {pair.male?.animal_code || '-'}
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
                        {pair.female?.animal_code || '-'}
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
                        {formatDate(pair.paired_on)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="font-body"
                        style={{
                          color: isLitterSoon ? '#854F0B' : '#6B7280',
                          fontSize: '14px'
                        }}
                      >
                        {formatDate(expectedLitter.toISOString())}
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
                        {weanDate ? formatDate(weanDate.toISOString()) : '-'}
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
                        {pair.litter_size || '-'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}