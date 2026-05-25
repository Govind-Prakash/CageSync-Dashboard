import { Archive, Rabbit, FlaskConical, Plus } from 'lucide-react'

export default function DashboardPage() {
  const emptyStates = [
    {
      title: 'No cages yet',
      description: 'Add your first cage to get started',
      icon: Archive,
    },
    {
      title: 'No animals yet',
      description: 'Animals will appear once cages are created',
      icon: Rabbit,
    },
    {
      title: 'No experiments yet',
      description: 'Create your first experiment',
      icon: FlaskConical,
    },
  ]

  return (
    <div>
      {/* Empty State Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {emptyStates.map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.title}
              className="rounded-xl p-6 shadow-sm text-center"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
            >
              <div className="flex justify-center mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#F8FAFB' }}
                >
                  <Icon className="w-6 h-6" style={{ color: '#1A7F64' }} />
                </div>
              </div>

              <h3 className="font-display font-medium text-lg mb-2" style={{ color: '#1A1A2E' }}>
                {item.title}
              </h3>

              <p className="font-body text-sm mb-4" style={{ color: '#6B7280' }}>
                {item.description}
              </p>

              <button
                className="inline-flex items-center px-3 py-2 rounded-lg font-body font-medium text-sm transition-colors hover:opacity-90"
                style={{ backgroundColor: '#1A7F64', color: 'white' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add {item.title.split(' ')[1]}
              </button>
            </div>
          )
        })}
      </div>

      {/* Recent Activity Section */}
      <div
        className="rounded-xl p-6 shadow-sm"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}
      >
        <h2 className="font-display font-medium text-xl mb-4" style={{ color: '#1A1A2E' }}>
          Recent Activity
        </h2>

        <div
          className="text-center py-12 rounded-lg border-2 border-dashed"
          style={{ backgroundColor: '#F8FAFB', borderColor: '#E2E8F0' }}
        >
          <p className="font-body text-sm" style={{ color: '#6B7280' }}>
            No recent activity yet. Start by adding cages and animals.
          </p>
        </div>
      </div>
    </div>
  )
}