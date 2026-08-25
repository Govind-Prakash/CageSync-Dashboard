import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveLabId } from '@/lib/supabase/lab'
import {
  Archive,
  Rabbit,
  FlaskConical,
  Flag,
  Heart,
  Plus,
  ArrowRight,
} from 'lucide-react'

/**
 * /dashboard root — the "home" page. Server component that fetches
 * counts for each entity type + the last 10 activity events across
 * cages / animals / litters / cage_flags. Renders live numbers when
 * data exists, honest empty-state cards + a CTA when it doesn't.
 *
 * Everything is scoped to the active lab (from profiles.lab_id via
 * getActiveLabId). RLS on the tables enforces membership so an
 * empty count is either "you have no data yet" or "you don't
 * belong to this lab" — both correctly render as zero.
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const labId = await getActiveLabId(supabase)

  // Counts — cheap head-request per table with count=exact.
  const zero = { count: 0 as number | null }
  const [
    cagesCount,
    animalsCount,
    littersCount,
    unresolvedFlagsCount,
    breedingPairsCount,
    experimentsCount,
  ] = labId
    ? await Promise.all([
        supabase.from('cages').select('*', { count: 'exact', head: true }).eq('lab_id', labId),
        supabase.from('animals').select('*', { count: 'exact', head: true }).eq('lab_id', labId),
        supabase
          .from('litters')
          .select('*', { count: 'exact', head: true })
          .eq('lab_id', labId)
          .eq('status', 'nursing'),
        supabase
          .from('cage_flags')
          .select('*', { count: 'exact', head: true })
          .eq('lab_id', labId)
          .eq('resolved', false),
        supabase
          .from('breeding_pairs')
          .select('*', { count: 'exact', head: true })
          .eq('lab_id', labId),
        supabase
          .from('experiments')
          .select('*', { count: 'exact', head: true })
          .eq('lab_id', labId),
      ])
    : [zero, zero, zero, zero, zero, zero]

  const recent = labId ? await fetchRecentActivity(supabase, labId) : []

  const cages = cagesCount.count ?? 0
  const animals = animalsCount.count ?? 0
  const litters = littersCount.count ?? 0
  const unresolvedFlags = unresolvedFlagsCount.count ?? 0
  const breedingPairs = breedingPairsCount.count ?? 0
  const experiments = experimentsCount.count ?? 0

  const isEmpty = cages === 0 && animals === 0 && recent.length === 0

  return (
    <div className="pt-2 mx-auto" style={{ maxWidth: '1080px' }}>
      {isEmpty ? (
        <EmptyHero />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <StatCard label="Cages"           value={cages}           href="/dashboard/cages"        icon={Archive}      />
            <StatCard label="Animals"         value={animals}         href="/dashboard/animals"      icon={Rabbit}       />
            <StatCard label="Litters nursing" value={litters}         href="/dashboard/breeding"     icon={Heart}        />
            <StatCard label="Flags open"      value={unresolvedFlags} href="/dashboard/flags"        icon={Flag}         urgent={unresolvedFlags > 0} />
            <StatCard label="Breeding pairs"  value={breedingPairs}   href="/dashboard/breeding"     icon={Heart}        />
            <StatCard label="Experiments"     value={experiments}     href="/dashboard/experiments"  icon={FlaskConical} />
          </div>

          <div
            className="bg-white rounded-xl p-6 border"
            style={{ borderColor: '#E2E8F0' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '16px' }}>
                Recent activity
              </h2>
              <span className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
                {recent.length} {recent.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {recent.length === 0 ? (
              <p className="font-body" style={{ color: '#6B7280', fontSize: '13px' }}>
                No activity in the last few days. As you add cages, animals,
                litters, and flags they'll appear here.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                {recent.map((r, i) => (
                  <ActivityRow key={`${r.kind}-${r.id}-${i}`} row={r} />
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ---------- data helpers ----------

interface ActivityRow {
  kind: 'cage' | 'animal' | 'litter' | 'flag'
  id: string
  title: string
  subtitle: string
  at: string
}

async function fetchRecentActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  labId: string,
): Promise<ActivityRow[]> {
  const [cages, animals, litters, flags] = await Promise.all([
    supabase
      .from('cages')
      .select('id, label, cage_code, cage_type, created_at')
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('animals')
      .select('id, animal_code, strain, sex, created_at')
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('litters')
      .select('id, pup_count, dob, created_at')
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('cage_flags')
      .select('id, severity, notes, created_at, cage:cages!inner(label, cage_code), type:flag_types!inner(label)')
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const rows: ActivityRow[] = []

  for (const c of cages.data ?? []) {
    rows.push({
      kind: 'cage',
      id: c.id,
      title: `Cage added — ${c.label || c.cage_code}`,
      subtitle: `${c.cage_type ?? 'cage'} · ${c.cage_code}`,
      at: c.created_at,
    })
  }
  for (const a of animals.data ?? []) {
    rows.push({
      kind: 'animal',
      id: a.id,
      title: `Animal added — ${a.animal_code ?? 'unnamed'}`,
      subtitle: [a.strain, a.sex].filter(Boolean).join(' · ') || 'no strain',
      at: a.created_at,
    })
  }
  for (const l of litters.data ?? []) {
    rows.push({
      kind: 'litter',
      id: l.id,
      title: `Litter added — ${l.pup_count} pups`,
      subtitle: l.dob ? `DOB ${new Date(l.dob).toLocaleDateString()}` : '',
      at: l.created_at,
    })
  }
  for (const f of flags.data ?? []) {
    const cage = Array.isArray(f.cage) ? f.cage[0] : f.cage
    const type = Array.isArray(f.type) ? f.type[0] : f.type
    rows.push({
      kind: 'flag',
      id: f.id,
      title: `Flag: ${type?.label ?? 'Flag'} — ${cage?.label || cage?.cage_code || 'cage'}`,
      subtitle: (f.severity as string).toUpperCase() + (f.notes ? ` · ${f.notes.slice(0, 60)}${f.notes.length > 60 ? '…' : ''}` : ''),
      at: f.created_at,
    })
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : -1))
  return rows.slice(0, 10)
}

// ---------- presentational ----------

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  urgent = false,
}: {
  label: string
  value: number
  href: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  urgent?: boolean
}) {
  const accent = urgent ? '#A32D2D' : '#1A7F64'
  const bg = urgent ? '#FCEBEB' : '#E8F5F1'
  return (
    <Link
      href={href}
      className="bg-white rounded-xl p-4 border transition-colors hover:shadow-sm block"
      style={{ borderColor: urgent ? '#FCEBEB' : '#E2E8F0' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <ArrowRight className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
      </div>
      <div
        className="font-display font-semibold"
        style={{ color: '#1A1A2E', fontSize: '24px', lineHeight: 1 }}
      >
        {value}
      </div>
      <div
        className="font-body mt-1"
        style={{ color: urgent && value > 0 ? accent : '#6B7280', fontSize: '11.5px' }}
      >
        {label}
      </div>
    </Link>
  )
}

function ActivityRow({ row }: { row: ActivityRow }) {
  const iconFor = (): {
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    color: string
    bg: string
  } => {
    switch (row.kind) {
      case 'cage':   return { Icon: Archive,      color: '#1A7F64', bg: '#E8F5F1' }
      case 'animal': return { Icon: Rabbit,       color: '#7C3AED', bg: '#EDE9FE' }
      case 'litter': return { Icon: Heart,        color: '#EA580C', bg: '#FEF3D8' }
      case 'flag':   return { Icon: Flag,         color: '#A32D2D', bg: '#FCEBEB' }
    }
  }
  const { Icon, color, bg } = iconFor()
  return (
    <li className="flex items-start py-3" style={{ gap: '12px' }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: bg }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '13px' }}>
          {row.title}
        </div>
        {row.subtitle && (
          <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
            {row.subtitle}
          </div>
        )}
      </div>
      <div
        className="font-body flex-shrink-0"
        style={{ color: '#9CA3AF', fontSize: '11px' }}
      >
        {relativeTime(row.at)}
      </div>
    </li>
  )
}

function EmptyHero() {
  return (
    <div
      className="bg-white rounded-xl p-10 border text-center"
      style={{ borderColor: '#E2E8F0' }}
    >
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: '#E8F5F1' }}
      >
        <Archive className="w-7 h-7" style={{ color: '#1A7F64' }} />
      </div>
      <h2 className="font-display font-semibold mb-2" style={{ color: '#1A1A2E', fontSize: '20px' }}>
        Welcome to your lab
      </h2>
      <p className="font-body mx-auto mb-6" style={{ color: '#6B7280', fontSize: '14px', maxWidth: '440px' }}>
        Once you add cages, animals, and litters, this page will show a live
        pulse of your colony. Start by adding your first cage.
      </p>
      <Link
        href="/dashboard/cages"
        className="inline-flex items-center font-body font-medium"
        style={{
          backgroundColor: '#1A7F64', color: 'white',
          fontSize: '14px', padding: '10px 20px', borderRadius: '8px',
          gap: '6px',
        }}
      >
        <Plus className="w-4 h-4" />
        Add your first cage
      </Link>
    </div>
  )
}

function relativeTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}
