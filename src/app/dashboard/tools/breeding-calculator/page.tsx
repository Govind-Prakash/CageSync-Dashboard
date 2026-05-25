'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function BreedingCalculatorPage() {
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [pairingDate, setPairingDate] = useState('')
  const [species, setSpecies] = useState('mouse')
  const [generationDate, setGenerationDate] = useState('')
  const [generationCount, setGenerationCount] = useState(1)
  const [showTimeline, setShowTimeline] = useState(false)

  // Calculate wean date (DOB + 21 days)
  const calculateWeanDate = (dob: string) => {
    if (!dob) return null
    const birth = new Date(dob)
    const wean = new Date(birth)
    wean.setDate(birth.getDate() + 21)
    return wean
  }

  // Calculate expected litter date range
  const calculateLitterDate = (pairing: string, speciesType: string) => {
    if (!pairing) return null
    const pair = new Date(pairing)
    const minDays = speciesType === 'mouse' ? 19 : 21
    const maxDays = speciesType === 'mouse' ? 21 : 23

    const minDate = new Date(pair)
    minDate.setDate(pair.getDate() + minDays)

    const maxDate = new Date(pair)
    maxDate.setDate(pair.getDate() + maxDays)

    return { minDate, maxDate }
  }

  // Calculate days remaining or elapsed
  const calculateDaysRemaining = (targetDate: Date) => {
    const today = new Date()
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Calculate generation timeline
  const calculateGenerationTimeline = () => {
    if (!generationDate || generationCount < 1) return []

    const timeline = []
    let currentPairing = new Date(generationDate)

    for (let gen = 1; gen <= generationCount; gen++) {
      const litter = calculateLitterDate(currentPairing.toISOString().split('T')[0], species)
      const weanDate = new Date(litter?.maxDate || currentPairing)
      weanDate.setDate(weanDate.getDate() + 21)

      const nextPairing = new Date(weanDate)
      nextPairing.setDate(weanDate.getDate() + 28) // Standard practice

      timeline.push({
        generation: gen,
        pairingDate: new Date(currentPairing),
        litterDate: litter?.maxDate || null,
        weanDate,
        nextPairingDate: gen < generationCount ? nextPairing : null
      })

      currentPairing = nextPairing
    }

    return timeline
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Format date range
  const formatDateRange = (minDate: Date, maxDate: Date) => {
    return `${formatDate(minDate)} — ${formatDate(maxDate)}`
  }

  const weanDate = dateOfBirth ? calculateWeanDate(dateOfBirth) : null
  const litterDate = pairingDate ? calculateLitterDate(pairingDate, species) : null
  const timeline = generationDate ? calculateGenerationTimeline() : []

  useEffect(() => {
    setShowTimeline(dateOfBirth || pairingDate || generationDate ? true : false)
  }, [dateOfBirth, pairingDate, generationDate])

  return (
    <div className="pt-2">
      {/* Back Button */}
      <Link
        href="/dashboard/tools"
        className="inline-flex items-center gap-1 font-body transition-colors mb-4"
        style={{
          color: '#6B7280',
          fontSize: '13px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#1A1A2E'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#6B7280'
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tools
      </Link>

      {/* Info Box */}
      <div
        className="rounded-r-lg mb-6"
        style={{
          backgroundColor: '#E8F5F1',
          borderLeft: '3px solid #1A7F64',
          padding: '12px 16px'
        }}
      >
        <p
          className="font-body"
          style={{
            color: '#1A7F64',
            fontSize: '13px'
          }}
        >
          ✓ Logged in — results can be saved to your breeding records directly from the dashboard
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Calculator Form */}
        <div
          className="bg-white rounded-xl"
          style={{
            border: '1px solid #E2E8F0',
            padding: '24px'
          }}
        >
          {/* Section 1 - Wean Date Calculator */}
          <div className="mb-6">
            <h3
              className="font-display font-medium mb-2"
              style={{
                color: '#1A1A2E',
                fontSize: '15px'
              }}
            >
              Wean Date Calculator
            </h3>
            <p
              className="font-body mb-4"
              style={{
                color: '#6B7280',
                fontSize: '13px'
              }}
            >
              Calculate when pups should be weaned (DOB + 21 days)
            </p>

            <div className="mb-3">
              <label
                className="block font-body font-medium mb-2"
                style={{
                  color: '#1A1A2E',
                  fontSize: '13px'
                }}
              >
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-body"
                style={{
                  borderColor: '#E2E8F0',
                  fontSize: '14px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {weanDate && (
              <div className="space-y-1">
                <p
                  className="font-body font-bold"
                  style={{
                    color: '#1A7F64',
                    fontSize: '14px'
                  }}
                >
                  Wean Date: {formatDate(weanDate)}
                </p>
                <p
                  className="font-body"
                  style={{
                    color: '#6B7280',
                    fontSize: '13px'
                  }}
                >
                  {(() => {
                    const days = calculateDaysRemaining(weanDate)
                    return days > 0
                      ? `Days remaining: ${days} days`
                      : `${Math.abs(days)} days ago`
                  })()}
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="border-t mb-6"
            style={{ borderColor: '#E2E8F0' }}
          />

          {/* Section 2 - Litter Expected Date */}
          <div className="mb-6">
            <h3
              className="font-display font-medium mb-2"
              style={{
                color: '#1A1A2E',
                fontSize: '15px'
              }}
            >
              Expected Litter Date
            </h3>
            <p
              className="font-body mb-4"
              style={{
                color: '#6B7280',
                fontSize: '13px'
              }}
            >
              Calculate expected delivery (Pairing date + 19 days for mice)
            </p>

            <div className="mb-3">
              <label
                className="block font-body font-medium mb-2"
                style={{
                  color: '#1A1A2E',
                  fontSize: '13px'
                }}
              >
                Pairing Date
              </label>
              <input
                type="date"
                value={pairingDate}
                onChange={(e) => setPairingDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-body"
                style={{
                  borderColor: '#E2E8F0',
                  fontSize: '14px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            <div className="mb-3">
              <label
                className="block font-body font-medium mb-2"
                style={{
                  color: '#1A1A2E',
                  fontSize: '13px'
                }}
              >
                Species
              </label>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-body"
                style={{
                  borderColor: '#E2E8F0',
                  fontSize: '14px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              >
                <option value="mouse">Mouse (19-21 days)</option>
                <option value="rat">Rat (21-23 days)</option>
              </select>
            </div>

            {litterDate && (
              <div className="space-y-1">
                <p
                  className="font-body font-bold"
                  style={{
                    color: '#1A7F64',
                    fontSize: '14px'
                  }}
                >
                  Expected litter: {formatDateRange(litterDate.minDate, litterDate.maxDate)}
                </p>
                <p
                  className="font-body"
                  style={{
                    color: '#6B7280',
                    fontSize: '13px'
                  }}
                >
                  Days until litter: {calculateDaysRemaining(litterDate.minDate)} days
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            className="border-t mb-6"
            style={{ borderColor: '#E2E8F0' }}
          />

          {/* Section 3 - Generation Planner */}
          <div>
            <h3
              className="font-display font-medium mb-2"
              style={{
                color: '#1A1A2E',
                fontSize: '15px'
              }}
            >
              Generation Planner
            </h3>
            <p
              className="font-body mb-4"
              style={{
                color: '#6B7280',
                fontSize: '13px'
              }}
            >
              Plan multiple generations ahead
            </p>

            <div className="mb-3">
              <label
                className="block font-body font-medium mb-2"
                style={{
                  color: '#1A1A2E',
                  fontSize: '13px'
                }}
              >
                Generation 1 Pairing Date
              </label>
              <input
                type="date"
                value={generationDate}
                onChange={(e) => setGenerationDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-body"
                style={{
                  borderColor: '#E2E8F0',
                  fontSize: '14px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            <div className="mb-4">
              <label
                className="block font-body font-medium mb-2"
                style={{
                  color: '#1A1A2E',
                  fontSize: '13px'
                }}
              >
                Number of generations
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={generationCount}
                onChange={(e) => setGenerationCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border rounded-lg font-body"
                style={{
                  borderColor: '#E2E8F0',
                  fontSize: '14px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            <button
              className="w-full py-2 px-4 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#085041'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1A7F64'
              }}
            >
              Calculate
            </button>
          </div>
        </div>

        {/* Right Column - Results Panel */}
        <div
          className="bg-white rounded-xl"
          style={{
            border: '1px solid #E2E8F0',
            padding: '24px'
          }}
        >
          <h3
            className="font-display font-medium mb-6"
            style={{
              color: '#1A1A2E',
              fontSize: '15px'
            }}
          >
            Timeline
          </h3>

          {!showTimeline ? (
            <div className="flex items-center justify-center h-64">
              <p
                className="font-body text-center"
                style={{
                  color: '#6B7280',
                  fontSize: '14px'
                }}
              >
                Enter dates to see your breeding timeline
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wean Date Timeline Item */}
              {weanDate && (
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#25A882' }}
                  />
                  <div>
                    <p
                      className="font-body font-medium"
                      style={{
                        color: '#1A1A2E',
                        fontSize: '14px'
                      }}
                    >
                      Wean Date
                    </p>
                    <p
                      className="font-body"
                      style={{
                        color: '#6B7280',
                        fontSize: '13px'
                      }}
                    >
                      {formatDate(weanDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Litter Date Timeline Item */}
              {litterDate && (
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#F5A623' }}
                  />
                  <div>
                    <p
                      className="font-body font-medium"
                      style={{
                        color: '#1A1A2E',
                        fontSize: '14px'
                      }}
                    >
                      Expected Litter
                    </p>
                    <p
                      className="font-body"
                      style={{
                        color: '#6B7280',
                        fontSize: '13px'
                      }}
                    >
                      {formatDateRange(litterDate.minDate, litterDate.maxDate)}
                    </p>
                  </div>
                </div>
              )}

              {/* Generation Timeline Items */}
              {timeline.map((gen, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#1A7F64' }}
                    />
                    <div>
                      <p
                        className="font-body font-medium"
                        style={{
                          color: '#1A1A2E',
                          fontSize: '14px'
                        }}
                      >
                        Generation {gen.generation} Pairing
                      </p>
                      <p
                        className="font-body"
                        style={{
                          color: '#6B7280',
                          fontSize: '13px'
                        }}
                      >
                        {formatDate(gen.pairingDate)}
                      </p>
                    </div>
                  </div>

                  {gen.litterDate && (
                    <div className="flex items-center gap-3 ml-3">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#F5A623' }}
                      />
                      <div>
                        <p
                          className="font-body"
                          style={{
                            color: '#6B7280',
                            fontSize: '13px'
                          }}
                        >
                          Litter: {formatDate(gen.litterDate)}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 ml-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#25A882' }}
                    />
                    <div>
                      <p
                        className="font-body"
                        style={{
                          color: '#6B7280',
                          fontSize: '13px'
                        }}
                      >
                        Wean: {formatDate(gen.weanDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}