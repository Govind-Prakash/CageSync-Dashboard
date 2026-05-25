'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AddAnimalModalProps {
  children: React.ReactNode
}

export default function AddAnimalModal({ children }: AddAnimalModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [animalCode, setAnimalCode] = useState('')
  const [species, setSpecies] = useState('Mus musculus')
  const [strain, setStrain] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'unknown'>('unknown')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [genotype, setGenotype] = useState('')
  const [cageId, setCageId] = useState('')
  const [notes, setNotes] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!animalCode.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      const { error } = await supabase
        .from('animals')
        .insert({
          animal_code: animalCode.trim(),
          species: species.trim() || null,
          strain: strain.trim() || null,
          sex,
          date_of_birth: dateOfBirth || null,
          genotype: genotype.trim() || null,
          cage_id: cageId || null,
          notes: notes.trim() || null,
        })

      if (error) throw error

      // Reset form and close modal
      setAnimalCode('')
      setSpecies('Mus musculus')
      setStrain('')
      setSex('unknown')
      setDateOfBirth('')
      setGenotype('')
      setCageId('')
      setNotes('')
      setIsOpen(false)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Error adding animal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false)
      setError('')
    }
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={handleClose} />

          <div
            className="relative bg-white rounded-xl w-full mx-4"
            style={{ maxWidth: '480px', padding: '24px' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="font-display font-medium"
                style={{ color: '#1A1A2E', fontSize: '16px' }}
              >
                Add New Animal
              </h2>
              <button onClick={handleClose} disabled={isSubmitting}>
                <X className="w-5 h-5" style={{ color: '#6B7280' }} />
              </button>
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-lg"
                style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block font-body font-medium mb-1"
                  style={{ color: '#374151', fontSize: '13px' }}
                >
                  Animal Code *
                </label>
                <input
                  type="text"
                  value={animalCode}
                  onChange={(e) => setAnimalCode(e.target.value)}
                  required
                  className="w-full border rounded-lg font-body"
                  style={{
                    borderColor: '#E2E8F0',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block font-body font-medium mb-1"
                    style={{ color: '#374151', fontSize: '13px' }}
                  >
                    Species
                  </label>
                  <input
                    type="text"
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    className="w-full border rounded-lg font-body"
                    style={{
                      borderColor: '#E2E8F0',
                      padding: '8px 12px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block font-body font-medium mb-1"
                    style={{ color: '#374151', fontSize: '13px' }}
                  >
                    Strain
                  </label>
                  <input
                    type="text"
                    value={strain}
                    onChange={(e) => setStrain(e.target.value)}
                    className="w-full border rounded-lg font-body"
                    style={{
                      borderColor: '#E2E8F0',
                      padding: '8px 12px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block font-body font-medium mb-1"
                    style={{ color: '#374151', fontSize: '13px' }}
                  >
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as 'male' | 'female' | 'unknown')}
                    className="w-full border rounded-lg font-body"
                    style={{
                      borderColor: '#E2E8F0',
                      padding: '8px 12px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block font-body font-medium mb-1"
                    style={{ color: '#374151', fontSize: '13px' }}
                  >
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full border rounded-lg font-body"
                    style={{
                      borderColor: '#E2E8F0',
                      padding: '8px 12px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block font-body font-medium mb-1"
                  style={{ color: '#374151', fontSize: '13px' }}
                >
                  Genotype
                </label>
                <input
                  type="text"
                  value={genotype}
                  onChange={(e) => setGenotype(e.target.value)}
                  className="w-full border rounded-lg font-body"
                  style={{
                    borderColor: '#E2E8F0',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full border rounded-lg font-body"
                  style={{
                    borderColor: '#E2E8F0',
                    color: '#6B7280',
                    padding: '10px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !animalCode.trim()}
                  className="w-full rounded-lg font-body text-white"
                  style={{
                    backgroundColor: '#1A7F64',
                    padding: '10px'
                  }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Animal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}