import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Building2, DollarSign } from 'lucide-react'
import AffiliatedLabsList from './AffiliatedLabsList'
import PendingRequests from './PendingRequests'
import FacilityStaffList from './FacilityStaffList'

/// /dashboard/facility — landing page for anyone who has a
/// facility_memberships row. Server component fetches the user's
/// primary facility (currently first one; multi-facility picker
/// deferred) plus the four data slices each sub-component needs:
///   - active affiliations (labs currently under oversight)
///   - pending inbound (a lab requested us) + outbound (we
///     requested a lab)
///   - facility staff members
///
/// Redirects to /dashboard for users with no facility_memberships
/// so the URL isn't a surprise for lab-only accounts.
export default async function FacilityPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Which facilities does the caller belong to?
  const { data: memberships } = await supabase
    .from('facility_memberships')
    .select('facility_id, role, facilities!inner (id, name, institution)')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) {
    // No facility affiliation → this page isn't for them.
    redirect('/dashboard')
  }

  // MVP: pick the first facility. When a user belongs to multiple
  // facilities we'll add a header picker like the lab switcher.
  const primary = memberships[0]
  const facility = Array.isArray(primary.facilities)
    ? primary.facilities[0]
    : primary.facilities
  const facilityId = facility?.id as string
  const myRole = primary.role as string

  // Affiliations for this facility, grouped by status.
  const { data: allAffs } = await supabase
    .from('lab_facility_affiliations')
    .select(`
      lab_id, facility_id, status, requested_by_side,
      requested_at, responded_at, notes,
      lab:labs!inner (id, name, institution)
    `)
    .eq('facility_id', facilityId)

  const affiliations = allAffs ?? []
  const activeAffiliations = affiliations.filter((a: any) => a.status === 'active')
  const pendingAffiliations = affiliations.filter((a: any) => a.status === 'pending')

  // Split pending by which side originated so the UI can show
  // "labs waiting for our response" vs "labs we're waiting on".
  const inboundPending = pendingAffiliations.filter((a: any) => a.requested_by_side === 'lab')
  const outboundPending = pendingAffiliations.filter((a: any) => a.requested_by_side === 'facility')

  // Facility staff.
  const { data: staff } = await supabase
    .from('facility_memberships')
    .select('user_id, role, profiles!inner (id, full_name, email)')
    .eq('facility_id', facilityId)

  const isFacilityManager = myRole === 'facility_manager'
  const canBill = myRole === 'facility_vet' || myRole === 'facility_manager'

  return (
    <div className="pt-2 mx-auto" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center" style={{ gap: '12px' }}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#E8F5F1' }}
          >
            <Building2 className="w-5 h-5" style={{ color: '#1A7F64' }} />
          </div>
          <div>
            <h1 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '20px' }}>
              {facility?.name ?? 'Facility'}
            </h1>
            <p className="font-body" style={{ color: '#6B7280', fontSize: '13px' }}>
              {facility?.institution ? `${facility.institution} · ` : ''}
              You are {formatRole(myRole)}
            </p>
          </div>
        </div>
        {canBill && (
          <Link
            href="/dashboard/facility/billing"
            className="font-body font-medium inline-flex items-center"
            style={{
              backgroundColor: '#1A7F64', color: 'white',
              fontSize: '13px', padding: '8px 14px', borderRadius: '6px',
              textDecoration: 'none', gap: '6px',
            }}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Billing
          </Link>
        )}
      </div>

      <div className="space-y-8">
        <PendingRequests
          facilityId={facilityId}
          inbound={inboundPending as any[]}
          outbound={outboundPending as any[]}
          canManage={isFacilityManager}
        />

        <AffiliatedLabsList
          facilityId={facilityId}
          affiliations={activeAffiliations as any[]}
          canManage={isFacilityManager}
        />

        <FacilityStaffList
          facilityId={facilityId}
          staff={(staff ?? []) as any[]}
          canManage={isFacilityManager}
        />
      </div>
    </div>
  )
}

function formatRole(role: string) {
  switch (role) {
    case 'facility_manager':    return 'Facility Manager'
    case 'facility_vet':        return 'Facility Vet'
    case 'facility_technician': return 'Facility Technician'
    default:                    return role
  }
}
