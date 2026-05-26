import Link from 'next/link'
import { Calendar } from 'lucide-react'

export default function CalendarPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Icon */}
      <Calendar className="w-12 h-12 mb-4" style={{ color: '#1A7F64' }} />

      {/* Title */}
      <h1
        className="font-display font-medium mb-2"
        style={{ fontSize: '20px', color: '#1A1A2E' }}
      >
        Full Colony Calendar
      </h1>

      {/* Description */}
      <p
        className="mb-6 max-w-md"
        style={{ fontSize: '14px', color: '#6B7280' }}
      >
        Complete calendar view coming soon
      </p>

      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-primary hover:underline transition-colors"
        style={{ fontSize: '14px', color: '#1A7F64' }}
      >
        ← Back
      </Link>
    </div>
  )
}