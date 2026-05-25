import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, Plus, MoreHorizontal } from 'lucide-react'
import InviteMemberModal from '@/components/team/invite-member-modal'

export default async function TeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: invites } = await supabase
    .from('lab_invites')
    .select('*')
    .eq('accepted', false)
    .order('created_at', { ascending: false })

  // Get user initials
  const getUserInitials = (email: string, fullName?: string) => {
    if (fullName) {
      const names = fullName.split(' ')
      return names.length >= 2
        ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
        : fullName.slice(0, 2).toUpperCase()
    }

    if (email) {
      const name = email.split('@')[0]
      const parts = name.split(/[._-]/)
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }

    return 'GP'
  }

  // Get display name
  const getDisplayName = (email: string, fullName?: string) => {
    if (fullName) return fullName

    if (email) {
      const name = email.split('@')[0]
      const parts = name.split(/[._-]/)
      if (parts.length >= 2) {
        return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
      }
      return name.charAt(0).toUpperCase() + name.slice(1)
    }

    return 'Unknown User'
  }

  // Get relative time
  const getRelativeTime = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffTime = now.getTime() - past.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '1 day ago'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return `${Math.ceil(diffDays / 30)} months ago`
  }

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Check if invite is expired (7 days)
  const isExpired = (date: string) => {
    const inviteDate = new Date(date)
    const expiryDate = new Date(inviteDate)
    expiryDate.setDate(inviteDate.getDate() + 7)
    return new Date() > expiryDate
  }

  // Get role badge styles
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      pi: { bg: '#E8F5F1', color: '#1A7F64', text: 'Principal Investigator' },
      lab_manager: { bg: '#E8F5F1', color: '#1A7F64', text: 'Lab Manager' },
      researcher: { bg: '#F3F4F6', color: '#6B7280', text: 'Researcher' },
      technician: { bg: '#FEF3D8', color: '#854F0B', text: 'Technician' },
      observer: { bg: '#F3F4F6', color: '#6B7280', text: 'Observer' }
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.observer

    return (
      <span
        className="px-2 py-1 rounded-full font-body text-xs"
        style={{
          backgroundColor: config.bg,
          color: config.color
        }}
      >
        {config.text}
      </span>
    )
  }

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    const isActive = status === 'confirmed'
    return (
      <span
        className="px-2 py-1 rounded-full font-body text-xs"
        style={{
          backgroundColor: isActive ? '#E8F5F1' : '#FEF3D8',
          color: isActive ? '#1A7F64' : '#854F0B'
        }}
      >
        {isActive ? 'Active' : 'Pending'}
      </span>
    )
  }

  return (
    <div className="pt-2">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search members..."
            className="border rounded-lg font-body placeholder-gray-500 focus:outline-none focus:border-[#1A7F64] focus:ring-2 focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              fontSize: '14px',
              padding: '8px 12px',
              width: '280px',
              color: '#1A1A2E'
            }}
          />
        </div>
        <InviteMemberModal>
          <button
            className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
            style={{
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </button>
        </InviteMemberModal>
      </div>

      {/* Members Table or Empty State */}
      {!members || members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Users
            style={{ color: '#1A7F64', width: '40px', height: '40px' }}
            className="mb-4"
          />
          <h3
            className="font-display font-medium mb-2"
            style={{
              color: '#1A1A2E',
              fontSize: '16px'
            }}
          >
            No team members yet
          </h3>
          <p
            className="font-body text-center mb-6 max-w-sm"
            style={{
              color: '#6B7280',
              fontSize: '14px'
            }}
          >
            Invite researchers, technicians and lab managers to your lab
          </p>
          <InviteMemberModal>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg font-body font-medium transition-colors"
              style={{
                backgroundColor: '#1A7F64',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </button>
          </InviteMemberModal>
        </div>
      ) : (
        <div className="bg-white rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: '#F8FAFB' }}>
              <tr>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Member
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Role
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Joined
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Status
                </th>
                <th
                  className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                  style={{
                    color: '#6B7280',
                    fontSize: '11px'
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-display font-semibold"
                        style={{
                          backgroundColor: '#1A7F64',
                          color: 'white',
                          fontSize: '12px'
                        }}
                      >
                        {getUserInitials(member.email, member.full_name)}
                      </div>
                      <div>
                        <div
                          className="font-body font-medium"
                          style={{
                            color: '#1A1A2E',
                            fontSize: '14px'
                          }}
                        >
                          {getDisplayName(member.email, member.full_name)}
                        </div>
                        <div
                          className="font-body"
                          style={{
                            color: '#6B7280',
                            fontSize: '12px'
                          }}
                        >
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(member.role || 'observer')}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="font-body"
                      style={{
                        color: '#6B7280',
                        fontSize: '14px'
                      }}
                    >
                      {getRelativeTime(member.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge('confirmed')}
                  </td>
                  <td className="px-6 py-4">
                    {member.role !== 'pi' && (
                      <button
                        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        style={{ color: '#6B7280' }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Invites Section */}
      <div style={{ marginTop: '32px' }}>
        <h2
          className="font-display font-medium mb-4"
          style={{
            color: '#1A1A2E',
            fontSize: '14px'
          }}
        >
          Pending Invites
        </h2>

        {!invites || invites.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ color: '#6B7280', fontSize: '14px' }}
          >
            No pending invites
          </div>
        ) : (
          <div className="bg-white rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: '#F8FAFB' }}>
                <tr>
                  <th
                    className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                    style={{
                      color: '#6B7280',
                      fontSize: '11px'
                    }}
                  >
                    Email
                  </th>
                  <th
                    className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                    style={{
                      color: '#6B7280',
                      fontSize: '11px'
                    }}
                  >
                    Role
                  </th>
                  <th
                    className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                    style={{
                      color: '#6B7280',
                      fontSize: '11px'
                    }}
                  >
                    Invited
                  </th>
                  <th
                    className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                    style={{
                      color: '#6B7280',
                      fontSize: '11px'
                    }}
                  >
                    Expires
                  </th>
                  <th
                    className="px-6 py-3 text-left font-body font-medium uppercase tracking-wider"
                    style={{
                      color: '#6B7280',
                      fontSize: '11px'
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const expired = isExpired(invite.created_at)
                  const expiryDate = new Date(invite.created_at)
                  expiryDate.setDate(expiryDate.getDate() + 7)

                  return (
                    <tr
                      key={invite.id}
                      className="border-b"
                      style={{ borderColor: '#E2E8F0' }}
                    >
                      <td className="px-6 py-4">
                        <span
                          className="font-body"
                          style={{
                            color: '#1A1A2E',
                            fontSize: '14px'
                          }}
                        >
                          {invite.email}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(invite.role)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="font-body"
                          style={{
                            color: '#6B7280',
                            fontSize: '14px'
                          }}
                        >
                          {getRelativeTime(invite.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="font-body"
                          style={{
                            color: expired ? '#A32D2D' : '#6B7280',
                            fontSize: '14px'
                          }}
                        >
                          {formatDate(expiryDate.toISOString())}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 rounded-lg font-body text-xs transition-colors"
                            style={{
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280'
                            }}
                          >
                            Resend
                          </button>
                          <button
                            className="px-3 py-1 rounded-lg font-body text-xs transition-colors"
                            style={{
                              backgroundColor: '#FCEBEB',
                              color: '#A32D2D'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}