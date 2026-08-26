import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DollarSign, ArrowLeft } from 'lucide-react'
import { formatMoney } from '@/lib/currency'
import SetCurrencyForm from './SetCurrencyForm'
import SetRateForm from './SetRateForm'
import LogServiceForm from './LogServiceForm'
import RecentServicesTable from './RecentServicesTable'

export default async function FacilityBillingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only facility_vet / facility_manager can see this page.
  const { data: memberships } = await supabase
    .from('facility_memberships')
    .select('facility_id, role, facilities!inner (id, name, institution, currency_code)')
    .eq('user_id', user.id)

  const eligible = (memberships ?? []).find(
    (m: any) => m.role === 'facility_vet' || m.role === 'facility_manager'
  )
  if (!eligible) redirect('/dashboard')

  const facility = Array.isArray(eligible.facilities)
    ? eligible.facilities[0]
    : eligible.facilities
  const facilityId = facility?.id as string
  const currencyCode = (facility?.currency_code as string) || 'USD'

  // Current rate = latest effective_from row for this facility.
  const { data: currentRate } = await supabase
    .from('facility_billing_rates')
    .select('id, weekly_maintenance_minor, vet_delegation_surcharge_minor, effective_from, set_by, created_at')
    .eq('facility_id', facilityId)
    .lte('effective_from', new Date().toISOString().slice(0, 10))
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Cages the vet can log services against — all cages in labs
  // affiliated with this facility.
  const { data: cages } = await supabase
    .from('cages')
    .select(`
      id, name, barcode, lab_id,
      lab:labs!inner (id, name, facility_id)
    `)
    .eq('lab.facility_id', facilityId)
    .order('name', { ascending: true })
    .limit(500)

  // Recent services logged by this vet (or anyone in this facility).
  const { data: recentServices } = await supabase
    .from('cage_services')
    .select(`
      id, service_type, description, amount_minor, currency_code,
      performed_at, performed_by,
      cage:cages!inner (id, name, barcode, lab_id, lab:labs!inner (id, name, facility_id)),
      billed:profiles!cage_services_billed_to_fkey (id, full_name, email)
    `)
    .eq('cage.lab.facility_id', facilityId)
    .order('performed_at', { ascending: false })
    .limit(25)

  return (
    <div className="pt-2 mx-auto" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center" style={{ gap: '12px' }}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#E8F5F1' }}
          >
            <DollarSign className="w-5 h-5" style={{ color: '#1A7F64' }} />
          </div>
          <div>
            <h1 className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '20px' }}>
              Billing — {facility?.name ?? 'Facility'}
            </h1>
            <p className="font-body" style={{ color: '#6B7280', fontSize: '13px' }}>
              Set cage-maintenance rates and log ad-hoc vet services.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/facility"
          className="font-body inline-flex items-center"
          style={{ color: '#6B7280', fontSize: '13px', gap: '4px', textDecoration: 'none' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Facility
        </Link>
      </div>

      <div className="space-y-6">
        {/* Current rate summary */}
        <section
          style={{
            backgroundColor: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <h2 className="font-display font-medium mb-3" style={{ color: '#1A1A2E', fontSize: '14px' }}>
            Current rate
          </h2>
          {currentRate ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
                  Weekly maintenance / cage
                </div>
                <div className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '20px' }}>
                  {formatMoney(currentRate.weekly_maintenance_minor, currencyCode)}
                </div>
              </div>
              <div>
                <div className="font-body" style={{ color: '#6B7280', fontSize: '12px' }}>
                  Delegation surcharge / cage
                </div>
                <div className="font-display font-semibold" style={{ color: '#1A1A2E', fontSize: '20px' }}>
                  {formatMoney(currentRate.vet_delegation_surcharge_minor, currencyCode)}
                </div>
              </div>
              <div className="col-span-2 font-body" style={{ color: '#6B7280', fontSize: '11px' }}>
                Effective from {currentRate.effective_from}
              </div>
            </div>
          ) : (
            <div className="font-body" style={{ color: '#6B7280', fontSize: '13px' }}>
              No rate set yet. Enter one below — bills for the current month will use it.
            </div>
          )}
        </section>

        {/* Currency picker */}
        <SetCurrencyForm facilityId={facilityId} currentCurrency={currencyCode} />

        {/* Rate-setting form */}
        <SetRateForm
          facilityId={facilityId}
          currencyCode={currencyCode}
          currentWeeklyMinor={currentRate?.weekly_maintenance_minor ?? null}
          currentSurchargeMinor={currentRate?.vet_delegation_surcharge_minor ?? null}
        />

        {/* Log a service */}
        <LogServiceForm
          currencyCode={currencyCode}
          cages={(cages ?? []) as any[]}
        />

        {/* Recent services */}
        <RecentServicesTable
          services={(recentServices ?? []) as any[]}
          currencyCode={currencyCode}
        />
      </div>
    </div>
  )
}
