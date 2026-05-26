'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Filter,
  Settings
} from 'lucide-react'

type ViewType = 'week' | 'month' | 'day' | 'timeline'

interface CalendarEvent {
  id: string
  title: string
  type: 'breeding' | 'treatments' | 'observations' | 'critical' | 'maintenance'
  time?: string
  cage?: string
  animal?: string
  date: string
}

const eventCategories = {
  breeding: {
    color: '#F5A623',
    bgColor: '#FEF3D8',
    label: 'Breeding',
    events: ['Expected Litter', 'Wean Date', 'Breeding Pair Setup']
  },
  treatments: {
    color: '#1A7F64',
    bgColor: '#E8F5F1',
    label: 'Treatments',
    events: ['Injection', 'Drug Administration', 'Procedure']
  },
  observations: {
    color: '#25A882',
    bgColor: '#E8F5F1',
    label: 'Observations',
    events: ['Weight Check', 'Health Assessment', 'Behavioral Test']
  },
  critical: {
    color: '#E53E3E',
    bgColor: '#FCEBEB',
    label: 'Critical',
    events: ['Humane Endpoint', 'IACUC Deadline', 'Protocol Expiry']
  },
  maintenance: {
    color: '#6B7280',
    bgColor: '#F9FAFB',
    label: 'Maintenance',
    events: ['Cage Change', 'Room Transfer', 'Equipment Check']
  }
}

const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Wean litter — Cage A-107',
    type: 'breeding',
    time: '9:00 AM',
    cage: 'A-107',
    date: '2026-05-26'
  },
  {
    id: '2',
    title: 'Tamoxifen injection — Group B',
    type: 'treatments',
    time: '10:30 AM',
    cage: 'B-204',
    date: '2026-05-26'
  },
  {
    id: '3',
    title: 'Weight check — Experiment 3',
    type: 'observations',
    time: '2:00 PM',
    date: '2026-05-27'
  },
  {
    id: '4',
    title: 'Humane endpoint — M-0234',
    type: 'critical',
    time: '9:00 AM',
    animal: 'M-0234',
    date: '2026-05-28'
  },
  {
    id: '5',
    title: 'IACUC renewal due',
    type: 'critical',
    date: '2026-05-30'
  },
  {
    id: '6',
    title: 'Expected litter — Cage C-205',
    type: 'breeding',
    cage: 'C-205',
    date: '2026-06-02'
  }
]

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<ViewType>('week')
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 26)) // May 26, 2026
  const [selectedFilters, setSelectedFilters] = useState({
    breeding: true,
    treatments: true,
    observations: true,
    critical: true,
    maintenance: true
  })

  const formatDateRange = () => {
    if (currentView === 'week') {
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      startOfWeek.setDate(currentDate.getDate() - day)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' })
      const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' })

      if (startMonth === endMonth) {
        return `${startMonth} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`
      } else {
        return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`
      }
    }

    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    if (currentView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (currentView === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (currentView === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    }

    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date(2026, 4, 26)) // Set to "today" in our demo
  }

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(currentDate.getDate() - day)

    const days = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    return days
  }

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = date.toISOString().split('T')[0]
    return sampleEvents.filter(event =>
      event.date === dateKey && selectedFilters[event.type]
    )
  }

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Start from the beginning of the week that contains the first day
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay())

    // Generate 42 days (6 weeks) for consistent month grid
    const days = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === new Date(2026, 4, 26).toDateString()
      })
    }
    return days
  }

  const getHourlySlots = () => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        time: new Date(2026, 4, 26, hour).toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        }),
        events: sampleEvents.filter(event => {
          const eventDate = new Date(event.date)
          const slotDate = new Date(currentDate)

          if (event.time && eventDate.toDateString() === slotDate.toDateString()) {
            const eventHour = parseInt(event.time.split(':')[0])
            const isPM = event.time.includes('PM')
            const adjustedHour = isPM && eventHour !== 12 ? eventHour + 12 : (!isPM && eventHour === 12 ? 0 : eventHour)
            return adjustedHour === hour && selectedFilters[event.type]
          }
          return false
        })
      })
    }
    return slots
  }

  const getTimelineEvents = () => {
    return sampleEvents
      .filter(event => selectedFilters[event.type])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const toggleFilter = (type: keyof typeof selectedFilters) => {
    setSelectedFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const weekDays = getWeekDays()

  return (
    <div className="flex bg-surface" style={{ height: 'calc(100vh - 56px - 48px)' }}>
      {/* Left Sidebar - Filters & Mini Calendar */}
      <div
        className="w-80 border-r flex flex-col"
        style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
      >
        {/* Search */}
        <div className="p-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg font-body"
              style={{
                borderColor: '#E2E8F0',
                fontSize: '13px',
                color: '#1A1A2E'
              }}
            />
          </div>
        </div>

        {/* Event Filters */}
        <div className="p-4 border-b" style={{ borderColor: '#E2E8F0' }}>
          <div className="flex items-center mb-3">
            <Filter className="w-4 h-4 mr-2" style={{ color: '#6B7280' }} />
            <span className="font-display font-medium" style={{ fontSize: '14px', color: '#1A1A2E' }}>
              Event Types
            </span>
          </div>

          {Object.entries(eventCategories).map(([key, category]) => (
            <label key={key} className="flex items-center mb-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedFilters[key as keyof typeof selectedFilters]}
                onChange={() => toggleFilter(key as keyof typeof selectedFilters)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border-2 mr-3 transition-colors ${
                  selectedFilters[key as keyof typeof selectedFilters]
                    ? 'border-transparent'
                    : 'border-gray-300'
                }`}
                style={{
                  backgroundColor: selectedFilters[key as keyof typeof selectedFilters]
                    ? category.color
                    : 'transparent'
                }}
              >
                {selectedFilters[key as keyof typeof selectedFilters] && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
              <span className="font-body text-sm group-hover:text-ink transition-colors" style={{ color: '#6B7280' }}>
                {category.label}
              </span>
            </label>
          ))}
        </div>

        {/* Mini Calendar */}
        <div className="p-4 flex-1">
          <h3 className="font-display font-medium mb-3" style={{ fontSize: '14px', color: '#1A1A2E' }}>
            Quick Navigation
          </h3>
          <div className="text-center">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => navigatePeriod('prev')} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-display font-medium text-sm">
                {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => navigatePeriod('next')} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-xs rounded-md transition-colors"
              style={{
                backgroundColor: '#E8F5F1',
                color: '#1A7F64'
              }}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="h-16 px-6 border-b flex items-center justify-between"
          style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
        >
          {/* Left side - Date navigation */}
          <div className="flex items-center space-x-4">
            <button onClick={() => navigatePeriod('prev')} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-medium text-xl" style={{ color: '#1A1A2E' }}>
              {formatDateRange()}
            </h1>
            <button onClick={() => navigatePeriod('next')} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm rounded-md font-medium transition-colors"
              style={{
                backgroundColor: '#E8F5F1',
                color: '#1A7F64'
              }}
            >
              Today
            </button>
          </div>

          {/* Right side - View controls */}
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
              {(['week', 'month', 'day', 'timeline'] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                    currentView === view
                      ? 'text-white'
                      : 'text-gray-600 hover:text-ink hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: currentView === view ? '#1A7F64' : 'transparent'
                  }}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5" style={{ color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        {currentView === 'week' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Week header - FIXED with explicit column widths */}
            <div
              className="border-b bg-white sticky top-0 z-10"
              style={{
                borderColor: '#E2E8F0',
                display: 'grid',
                gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                marginRight: '17px' // Account for scrollbar width
              }}
            >
              {/* Time column header */}
              <div className="p-4 border-r" style={{ borderColor: '#E2E8F0', width: '80px' }} />

              {weekDays.map((day, index) => {
                const isToday = day.toDateString() === new Date(2026, 4, 26).toDateString()
                return (
                  <div
                    key={index}
                    className="p-4 text-center border-r last:border-r-0"
                    style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
                  >
                    <div className="font-body text-xs mb-1" style={{ color: '#6B7280' }}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                    </div>
                    <div
                      className={`font-display font-medium text-lg ${isToday ? 'text-white' : ''}`}
                      style={{
                        color: isToday ? 'white' : '#1A1A2E',
                        backgroundColor: isToday ? '#1A7F64' : 'transparent',
                        width: isToday ? '32px' : 'auto',
                        height: isToday ? '32px' : 'auto',
                        borderRadius: isToday ? '50%' : '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: isToday ? '0 auto' : '0'
                      }}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Week hourly grid - SCROLLABLE with matching column widths */}
            <div className="flex-1 overflow-y-auto">
              {getHourlySlots().map((slot) => (
                <div
                  key={slot.hour}
                  className="border-b"
                  style={{
                    borderColor: '#E2E8F0',
                    minHeight: '60px',
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 1fr 1fr 1fr'
                  }}
                >
                  {/* Time column */}
                  <div
                    className="p-2 text-right border-r text-xs font-medium bg-gray-25"
                    style={{
                      borderColor: '#E2E8F0',
                      color: '#6B7280',
                      width: '80px'
                    }}
                  >
                    {slot.time}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, dayIndex) => {
                    const dayEvents = sampleEvents.filter(event => {
                      const eventDate = new Date(event.date)
                      if (event.time && eventDate.toDateString() === day.toDateString()) {
                        const eventHour = parseInt(event.time.split(':')[0])
                        const isPM = event.time.includes('PM')
                        const adjustedHour = isPM && eventHour !== 12 ? eventHour + 12 : (!isPM && eventHour === 12 ? 0 : eventHour)
                        return adjustedHour === slot.hour && selectedFilters[event.type]
                      }
                      return false
                    })

                    return (
                      <div
                        key={dayIndex}
                        className="border-r last:border-r-0 p-1 bg-white"
                        style={{ borderColor: '#E2E8F0' }}
                      >
                        {dayEvents.map((event) => {
                          const category = eventCategories[event.type]
                          return (
                            <div
                              key={event.id}
                              className="p-1.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity mb-1"
                              style={{
                                backgroundColor: category.bgColor,
                                borderLeft: `3px solid ${category.color}`,
                                fontSize: '11px'
                              }}
                            >
                              <div className="font-medium line-clamp-1" style={{ color: '#1A1A2E' }}>
                                {event.title}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month View - FITS PERFECTLY, NO SCROLLING */}
        {currentView === 'month' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Month header - Fixed */}
            <div className="grid grid-cols-7 border-b bg-white" style={{ borderColor: '#E2E8F0' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="p-3 text-center font-display font-medium border-r last:border-r-0"
                  style={{ color: '#6B7280', backgroundColor: '#F9FAFB', fontSize: '13px', borderColor: '#E2E8F0' }}
                >
                  {day.toUpperCase()}
                </div>
              ))}
            </div>

            {/* Month grid - Exactly 6 rows, fills remaining space */}
            <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
              {getMonthDays().map((dayInfo, index) => {
                const dayEvents = getEventsForDate(dayInfo.date)
                return (
                  <div
                    key={index}
                    className={`border-r border-b last:border-r-0 p-2 flex flex-col ${
                      !dayInfo.isCurrentMonth ? 'bg-gray-25' : 'bg-white'
                    }`}
                    style={{ borderColor: '#E2E8F0' }}
                  >
                    {/* Date number */}
                    <div className="flex justify-start mb-1">
                      <span
                        className={`text-sm font-medium ${
                          dayInfo.isToday
                            ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center'
                            : dayInfo.isCurrentMonth
                            ? 'text-ink'
                            : 'text-gray-400'
                        }`}
                        style={{
                          backgroundColor: dayInfo.isToday ? '#1A7F64' : 'transparent',
                          color: dayInfo.isToday ? 'white' : dayInfo.isCurrentMonth ? '#1A1A2E' : '#9CA3AF',
                          fontSize: '13px'
                        }}
                      >
                        {dayInfo.date.getDate()}
                      </span>
                    </div>

                    {/* Events - limited to available space */}
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map((event) => {
                        const category = eventCategories[event.type]
                        return (
                          <div
                            key={event.id}
                            className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: category.bgColor,
                              color: category.color,
                              fontSize: '9px',
                              lineHeight: '1.2'
                            }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 2 && (
                        <div
                          className="text-xs px-1.5 py-0.5 text-center"
                          style={{ color: '#6B7280', fontSize: '9px' }}
                        >
                          +{dayEvents.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Day View - SIDEBAR FIXED, TIMELINE SCROLLS */}
        {currentView === 'day' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day header - FIXED */}
            <div
              className="p-4 border-b text-center bg-white sticky top-0 z-10"
              style={{ borderColor: '#E2E8F0', backgroundColor: '#F9FAFB' }}
            >
              <h2 className="font-display font-medium text-lg" style={{ color: '#1A1A2E' }}>
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
            </div>

            {/* Hourly timeline - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto">
              {getHourlySlots().map((slot) => (
                <div
                  key={slot.hour}
                  className="flex border-b"
                  style={{ borderColor: '#E2E8F0', minHeight: '60px' }}
                >
                  {/* Time column - FIXED WIDTH */}
                  <div
                    className="w-20 p-3 text-right border-r flex items-start justify-end"
                    style={{ borderColor: '#E2E8F0', backgroundColor: '#F9FAFB' }}
                  >
                    <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                      {slot.time}
                    </span>
                  </div>

                  {/* Events column - FLEXIBLE */}
                  <div className="flex-1 p-2 bg-white">
                    {slot.events.map((event) => {
                      const category = eventCategories[event.type]
                      return (
                        <div
                          key={event.id}
                          className="mb-2 p-3 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: category.bgColor,
                            borderLeft: `4px solid ${category.color}`
                          }}
                        >
                          <div className="font-medium text-sm" style={{ color: '#1A1A2E' }}>
                            {event.title}
                          </div>
                          <div className="text-xs mt-1 flex items-center space-x-3" style={{ color: '#6B7280' }}>
                            <span>{event.time}</span>
                            {event.cage && <span>🏠 {event.cage}</span>}
                            {event.animal && <span>🐭 {event.animal}</span>}
                          </div>
                        </div>
                      )
                    })}
                    {/* Empty slot indicator */}
                    {slot.events.length === 0 && (
                      <div className="h-full min-h-12 hover:bg-gray-25 rounded transition-colors cursor-pointer" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {currentView === 'timeline' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6">
              <div className="space-y-4">
                {getTimelineEvents().map((event) => {
                  const category = eventCategories[event.type]
                  const eventDate = new Date(event.date)

                  return (
                    <div key={event.id} className="flex items-start space-x-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: category.color, boxShadow: '0 0 0 2px currentColor' }}
                        />
                        <div
                          className="w-0.5 h-16 mt-2"
                          style={{ backgroundColor: '#E2E8F0' }}
                        />
                      </div>

                      {/* Event content */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between">
                          <span
                            className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: category.bgColor,
                              color: category.color
                            }}
                          >
                            {category.label}
                          </span>
                          <span className="text-xs" style={{ color: '#6B7280' }}>
                            {eventDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                            {event.time && ` • ${event.time}`}
                          </span>
                        </div>

                        <h3 className="font-display font-medium mt-2 mb-1" style={{ color: '#1A1A2E' }}>
                          {event.title}
                        </h3>

                        {(event.cage || event.animal) && (
                          <div className="flex items-center space-x-4 text-sm" style={{ color: '#6B7280' }}>
                            {event.cage && <span>🏠 {event.cage}</span>}
                            {event.animal && <span>🐭 {event.animal}</span>}
                          </div>
                        )}

                        {/* Additional details */}
                        <div
                          className="mt-2 p-3 rounded-md"
                          style={{ backgroundColor: '#F9FAFB' }}
                        >
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            {event.type === 'breeding' && 'Monitor for breeding behavior and document pairing success.'}
                            {event.type === 'treatments' && 'Administer treatment according to protocol guidelines.'}
                            {event.type === 'observations' && 'Record observations in animal care log.'}
                            {event.type === 'critical' && 'Immediate attention required - follow emergency protocols.'}
                            {event.type === 'maintenance' && 'Complete routine maintenance task.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {getTimelineEvents().length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
                  <h3 className="font-display font-medium mb-2" style={{ color: '#1A1A2E' }}>
                    No events found
                  </h3>
                  <p style={{ color: '#6B7280' }}>
                    Adjust your filters to see more events
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}