'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

interface CalendarPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface CalendarEvent {
  id: string
  name: string
  type: string
  color: string
}

const sampleEvents: { [key: string]: CalendarEvent[] } = {
  '2026-05-26': [
    { id: '1', name: 'Wean litter — Cage A-107', type: 'Wean Date', color: '#F5A623' },
    { id: '2', name: 'Tamoxifen injection — Group B', type: 'Treatment', color: '#F5A623' },
  ],
  '2026-05-27': [
    { id: '3', name: 'Weight check — Experiment 3', type: 'Observation', color: '#1A7F64' },
  ],
  '2026-05-28': [
    { id: '4', name: 'Humane endpoint — M-0234', type: 'Critical', color: '#E53E3E' },
  ],
  '2026-05-30': [
    { id: '5', name: 'IACUC renewal due', type: 'Admin', color: '#E53E3E' },
  ],
  '2026-06-02': [
    { id: '6', name: 'Expected litter — Cage C-205', type: 'Breeding', color: '#F5A623' },
  ],
}

export default function CalendarPanel({ isOpen, onClose }: CalendarPanelProps) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4)) // May 2026
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 4, 26)) // May 26, 2026

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleOpenFullCalendar = () => {
    router.push('/dashboard/calendar')
    onClose()
  }

  const formatDateKey = (date: Date): string => {
    return date.getFullYear() + '-' +
           String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0')
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const key = formatDateKey(date)
    return sampleEvents[key] || []
  }

  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const renderCalendarGrid = () => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const today = new Date(2026, 4, 26) // May 26, 2026 as "today"

    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
      const isToday = date.getTime() === today.getTime()
      const isSelected = date.getTime() === selectedDate.getTime()
      const hasEvents = getEventsForDate(date).length > 0
      const events = getEventsForDate(date)

      days.push(
        <button
          key={i}
          onClick={() => setSelectedDate(date)}
          className={`
            w-9 h-9 text-center rounded-full text-sm font-normal transition-colors
            ${isToday
              ? 'bg-primary text-white font-semibold'
              : isSelected
                ? 'border border-primary'
                : 'hover:bg-gray-50'
            }
            ${!isCurrentMonth ? 'text-gray-300' : 'text-ink'}
          `}
          style={{
            backgroundColor: isToday ? '#1A7F64' : isSelected ? 'transparent' : undefined,
            borderColor: isSelected && !isToday ? '#1A7F64' : undefined,
            color: isToday ? 'white' : !isCurrentMonth ? '#D1D5DB' : '#1A1A2E'
          }}
        >
          <div className="flex flex-col items-center justify-center">
            <span style={{ fontSize: '13px' }}>{date.getDate()}</span>
            {hasEvents && !isToday && (
              <div
                className="w-1 h-1 rounded-full mt-0.5"
                style={{ backgroundColor: events[0].color }}
              />
            )}
          </div>
        </button>
      )
    }

    return days
  }

  const selectedEvents = getEventsForDate(selectedDate)

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-12 right-0 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden"
      style={{
        borderColor: '#E2E8F0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)'
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: '#E2E8F0', height: '44px' }}
      >
        <h2 className="font-display font-medium" style={{ fontSize: '14px', color: '#1A1A2E' }}>
          Calendar
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenFullCalendar}
            className="p-1 hover:text-primary transition-colors"
            title="Open full calendar"
            style={{ color: '#9CA3AF' }}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:text-red-500 transition-colors"
            style={{ color: '#9CA3AF' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini Calendar */}
      <div className="p-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" style={{ color: '#1A1A2E' }} />
          </button>
          <h3 className="font-display font-medium" style={{ fontSize: '13px', color: '#1A1A2E' }}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-50 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" style={{ color: '#1A1A2E' }} />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <div
              key={day}
              className="text-center py-1"
              style={{ fontSize: '10px', color: '#9CA3AF' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date Grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarGrid()}
        </div>
      </div>

      {/* Events Section */}
      <div
        className="border-t px-3 py-2"
        style={{ borderColor: '#E2E8F0' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium" style={{ fontSize: '12px', color: '#1A1A2E' }}>
            {formatSelectedDate(selectedDate)}
          </span>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
            {selectedEvents.length} events
          </span>
        </div>

        <div className="max-h-35 overflow-y-auto">
          {selectedEvents.length > 0 ? (
            selectedEvents.map((event) => (
              <div
                key={event.id}
                className="py-1.5 border-b last:border-b-0"
                style={{ borderColor: '#F9FAFB' }}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="line-clamp-1 font-medium"
                      style={{ fontSize: '12px', color: '#1A1A2E' }}
                    >
                      {event.name}
                    </p>
                    <p
                      className="line-clamp-1"
                      style={{ fontSize: '10px', color: '#9CA3AF' }}
                    >
                      {event.type}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p
              className="text-center py-4"
              style={{ fontSize: '12px', color: '#9CA3AF' }}
            >
              No events today
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="border-t px-3 py-2 text-center"
        style={{ borderColor: '#E2E8F0' }}
      >
        <button
          onClick={handleOpenFullCalendar}
          className="text-primary hover:underline transition-colors"
          style={{ fontSize: '12px', color: '#1A7F64' }}
        >
          Open full calendar →
        </button>
      </div>
    </div>
  )
}