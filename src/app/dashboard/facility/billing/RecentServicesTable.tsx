import { formatMoney } from '@/lib/currency'

interface ServiceRow {
  id: string
  service_type: string
  description: string | null
  amount_minor: number
  currency_code: string
  performed_at: string
  cage: { id: string; name: string | null; barcode: string | null; lab: any } | any
  billed: { id: string; full_name: string | null; email: string } | any
}

interface Props {
  services: ServiceRow[]
  currencyCode: string
}

const TYPE_LABELS: Record<string, string> = {
  procedure:    'Procedure',
  extra_care:   'Extra care',
  weekend_care: 'Weekend care',
  medication:   'Medication',
  other:        'Other',
}

/// Recent services logged in this facility. Server-rendered — no
/// interactivity yet (edits/refunds are a follow-up).
export default function RecentServicesTable({ services, currencyCode }: Props) {
  return (
    <section
      style={{
        backgroundColor: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '16px',
      }}
    >
      <h2 className="font-display font-medium mb-3" style={{ color: '#1A1A2E', fontSize: '14px' }}>
        Recent services ({services.length})
      </h2>

      {services.length === 0 ? (
        <div className="font-body" style={{ color: '#6B7280', fontSize: '13px' }}>
          No services logged yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            className="w-full"
            style={{ borderCollapse: 'collapse', fontSize: '13px' }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <Th>When</Th>
                <Th>Cage</Th>
                <Th>Type</Th>
                <Th>Billed to</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => {
                const cage = Array.isArray(s.cage) ? s.cage[0] : s.cage
                const lab = cage?.lab
                  ? (Array.isArray(cage.lab) ? cage.lab[0] : cage.lab)
                  : null
                const billed = Array.isArray(s.billed) ? s.billed[0] : s.billed
                return (
                  <tr
                    key={s.id}
                    style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}
                  >
                    <Td>
                      <div className="font-body" style={{ color: '#1A1A2E' }}>
                        {formatShortDate(s.performed_at)}
                      </div>
                    </Td>
                    <Td>
                      <div className="font-body font-medium" style={{ color: '#1A1A2E' }}>
                        {cage?.name || cage?.barcode || '—'}
                      </div>
                      {lab?.name && (
                        <div className="font-body" style={{ color: '#6B7280', fontSize: '11px' }}>
                          {lab.name}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <span
                        className="font-body"
                        style={{
                          backgroundColor: '#F3F4F6', color: '#374151',
                          fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                        }}
                      >
                        {TYPE_LABELS[s.service_type] ?? s.service_type}
                      </span>
                      {s.description && (
                        <div className="font-body mt-1" style={{ color: '#6B7280', fontSize: '11px' }}>
                          {s.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="font-body" style={{ color: '#1A1A2E' }}>
                        {billed?.full_name || billed?.email?.split('@')[0] || '—'}
                      </div>
                    </Td>
                    <Td align="right">
                      <div className="font-body font-medium" style={{ color: '#1A1A2E' }}>
                        {formatMoney(s.amount_minor, s.currency_code || currencyCode)}
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '8px 10px',
        color: '#6B7280',
        fontWeight: 500,
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ textAlign: align, padding: '10px', verticalAlign: 'top' }}>{children}</td>
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}
