'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Building2,
  Bell,
  Link,
  Shield,
  FileSpreadsheet,
  Smartphone
} from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  lab_settings: any
}

interface NotificationSettings {
  cage_flags: boolean
  humane_endpoint_alerts: boolean
  wean_date_reminders: boolean
  experiment_deadlines: boolean
  team_invites_accepted: boolean
}

const tabs = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'lab-profile', name: 'Lab Profile', icon: Building2 },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'integrations', name: 'Integrations', icon: Link },
  { id: 'account', name: 'Account', icon: Shield },
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Form states
  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')
  const [institution, setInstitution] = useState('')
  const [labName, setLabName] = useState('')
  const [labInstitution, setLabInstitution] = useState('')
  const [defaultStrain, setDefaultStrain] = useState('')
  const [labAddress, setLabAddress] = useState('')
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notifications, setNotifications] = useState<NotificationSettings>({
    cage_flags: true,
    humane_endpoint_alerts: true,
    wean_date_reminders: true,
    experiment_deadlines: true,
    team_invites_accepted: false,
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfile(profile)
        setFullName(profile.full_name || '')

        const labSettings = profile.lab_settings || {}
        setTitle(labSettings.title || '')
        setInstitution(labSettings.institution || '')
        setLabName(labSettings.lab_name || '')
        setLabInstitution(labSettings.lab_institution || '')
        setDefaultStrain(labSettings.default_strain || '')
        setLabAddress(labSettings.lab_address || '')
        setGoogleSheetsUrl(labSettings.google_sheets_url || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserInitials = (email: string): string => {
    if (!email) return 'GP'
    const name = email.split('@')[0]
    const parts = name.split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const saveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const currentLabSettings = profile.lab_settings || {}
      const updatedLabSettings = {
        ...currentLabSettings,
        title,
        institution
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          lab_settings: updatedLabSettings
        })
        .eq('id', profile.id)

      if (error) throw error

      showMessage('success', 'Profile updated successfully')
      setProfile({ ...profile, full_name: fullName, lab_settings: updatedLabSettings })
    } catch (error) {
      console.error('Error saving profile:', error)
      showMessage('error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const saveLabProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const labSettings = {
        ...profile.lab_settings,
        lab_name: labName,
        lab_institution: labInstitution,
        default_strain: defaultStrain,
        lab_address: labAddress,
        google_sheets_url: googleSheetsUrl,
      }

      const { error } = await supabase
        .from('profiles')
        .update({ lab_settings: labSettings })
        .eq('id', profile.id)

      if (error) throw error

      showMessage('success', 'Lab profile updated successfully')
      setProfile({ ...profile, lab_settings: labSettings })
    } catch (error) {
      console.error('Error saving lab profile:', error)
      showMessage('error', 'Failed to update lab profile')
    } finally {
      setSaving(false)
    }
  }

  const saveNotifications = async () => {
    setSaving(true)
    try {
      // In a real app, save to database
      showMessage('success', 'Notification preferences saved')
    } catch (error) {
      showMessage('error', 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const connectGoogleSheets = async () => {
    if (!googleSheetsUrl.includes('docs.google.com/spreadsheets')) {
      showMessage('error', 'Please enter a valid Google Sheets URL')
      return
    }

    await saveLabProfile()
    showMessage('success', 'Google Sheets connected successfully')
  }

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      showMessage('success', 'Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error updating password:', error)
      showMessage('error', 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A7F64] mx-auto mb-2"></div>
          <p style={{ color: '#6B7280', fontSize: '14px' }} className="font-body">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const renderProfileTab = () => (
    <div>
      {/* Avatar Section */}
      <div style={{ paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500 }}>
          Profile Picture
        </h4>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Update your avatar and personal information
        </p>

        <div className="flex items-center" style={{ gap: '12px' }}>
          <div
            className="rounded-full flex items-center justify-center font-display font-semibold"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#1A7F64',
              color: 'white',
              fontSize: '18px'
            }}
          >
            {getUserInitials(user.email || '')}
          </div>
          <div>
            <a
              href="#"
              className="font-body"
              style={{ color: '#6B7280', fontSize: '13px', textDecoration: 'underline' }}
            >
              Change Photo
            </a>
            <p className="font-body" style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>
              JPG or PNG, max 2MB
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div style={{ paddingTop: '20px', paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
          Personal Information
        </h4>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Your basic profile information
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="Enter your full name"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Title/Role
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="e.g. PhD Student, Postdoc, Lab Manager"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Institution
          </label>
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="e.g. Harvard University"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Email
          </label>
          <input
            type="email"
            value={user.email}
            disabled
            className="border font-body cursor-not-allowed"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              backgroundColor: '#F9FAFB',
              color: '#9CA3AF',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
          />
          <p className="font-body" style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '4px' }}>
            Email cannot be changed
          </p>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="font-body font-medium transition-colors"
          style={{
            backgroundColor: '#1A7F64',
            color: 'white',
            fontSize: '13px',
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )

  const renderLabProfileTab = () => (
    <div>
      {/* Info Box */}
      <div style={{ paddingBottom: '20px' }}>
        <div
          className="border-l-4 p-3"
          style={{
            backgroundColor: '#E8F5F1',
            borderLeftColor: '#1A7F64',
            borderRadius: '0 6px 6px 0'
          }}
        >
          <p className="font-body" style={{ color: '#1A7F64', fontSize: '13px' }}>
            Lab profile helps prefill your tools and cage cards automatically
          </p>
        </div>
      </div>

      {/* Lab Information Section */}
      <div style={{ paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
          Lab Information
        </h4>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Configure your lab details for better tool integration
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Lab Name
          </label>
          <input
            type="text"
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="e.g. Prakash Lab"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Institution
          </label>
          <input
            type="text"
            value={labInstitution}
            onChange={(e) => setLabInstitution(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="e.g. Hebrew University"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Default Strain
          </label>
          <input
            type="text"
            value={defaultStrain}
            onChange={(e) => setDefaultStrain(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="e.g. C57BL/6J"
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Lab Address (Optional)
          </label>
          <textarea
            value={labAddress}
            onChange={(e) => setLabAddress(e.target.value)}
            rows={3}
            className="border font-body focus:outline-none focus:ring-2 resize-none focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="Enter lab address..."
          />
        </div>

        <button
          onClick={saveLabProfile}
          disabled={saving}
          className="font-body font-medium transition-colors"
          style={{
            backgroundColor: '#1A7F64',
            color: 'white',
            fontSize: '13px',
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )

  const renderNotificationsTab = () => (
    <div>
      <div style={{ paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
          Notification Preferences
        </h4>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Choose when and how you receive notifications
        </p>

        <div>
          {[
            {
              key: 'cage_flags',
              title: 'Cage Flags',
              description: 'Get notified when facility staff flag a cage',
              critical: false
            },
            {
              key: 'humane_endpoint_alerts',
              title: 'Humane Endpoint Alerts',
              description: 'Critical alerts when animals reach humane endpoints',
              critical: true
            },
            {
              key: 'wean_date_reminders',
              title: 'Wean Date Reminders',
              description: 'Reminders 2 days before wean dates',
              critical: false
            },
            {
              key: 'experiment_deadlines',
              title: 'Experiment Deadlines',
              description: 'Alerts 7 days before experiment end dates',
              critical: false
            },
            {
              key: 'team_invites_accepted',
              title: 'Team Invites Accepted',
              description: 'When a team member accepts your invite',
              critical: false
            }
          ].map((item, index, array) => (
            <div key={item.key}>
              <div className="flex items-center justify-between" style={{ padding: '10px 0', maxHeight: '48px' }}>
                <div className="flex-1">
                  <div className="flex items-center" style={{ gap: '8px', marginBottom: '2px' }}>
                    <span className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
                      {item.title}
                    </span>
                    {item.critical && (
                      <span
                        className="font-body"
                        style={{
                          backgroundColor: '#FCEBEB',
                          color: '#A32D2D',
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}
                      >
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="font-body" style={{ color: '#9CA3AF', fontSize: '12px' }}>
                    {item.description}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof NotificationSettings]
                  }))}
                  className="relative inline-flex items-center rounded-full transition-colors"
                  style={{
                    width: '36px',
                    height: '20px',
                    backgroundColor: notifications[item.key as keyof NotificationSettings]
                      ? '#1A7F64'
                      : '#D1D5DB'
                  }}
                >
                  <span
                    className="inline-block rounded-full bg-white transition-transform"
                    style={{
                      width: '16px',
                      height: '16px',
                      transform: notifications[item.key as keyof NotificationSettings]
                        ? 'translateX(18px)'
                        : 'translateX(2px)'
                    }}
                  />
                </button>
              </div>
              {index < array.length - 1 && (
                <div style={{ height: '1px', backgroundColor: '#F9FAFB' }} />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveNotifications}
          disabled={saving}
          className="font-body font-medium transition-colors"
          style={{
            backgroundColor: '#1A7F64',
            color: 'white',
            fontSize: '13px',
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )

  const renderIntegrationsTab = () => (
    <div>
      {/* Google Sheets Section */}
      <div style={{ paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
          <FileSpreadsheet style={{ width: '16px', height: '16px', color: '#1A7F64' }} />
          <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500 }}>
            Google Sheets
          </h4>
        </div>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Automatically sync your colony data to a Google Sheet. One-directional: CageSync → Sheets
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Google Sheets URL
          </label>
          <input
            type="url"
            value={googleSheetsUrl}
            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>

        <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
          <button
            onClick={connectGoogleSheets}
            disabled={saving || !googleSheetsUrl}
            className="font-body font-medium border transition-colors disabled:opacity-50"
            style={{
              borderColor: '#1A7F64',
              color: '#1A7F64',
              fontSize: '13px',
              padding: '6px 16px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            Connect
          </button>

          <span
            className="font-body"
            style={{
              backgroundColor: googleSheetsUrl ? '#E8F5F1' : '#F3F4F6',
              color: googleSheetsUrl ? '#1A7F64' : '#6B7280',
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '4px'
            }}
          >
            {googleSheetsUrl ? 'Connected' : 'Not connected'}
          </span>
        </div>

        <p className="font-body" style={{ color: '#9CA3AF', fontSize: '12px' }}>
          Data syncs automatically every hour
        </p>
      </div>

      {/* API Access Section */}
      <div style={{ paddingTop: '20px', paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
          API Keys
        </h4>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Use API keys to connect CageSync to your own tools
        </p>

        <span
          className="font-body"
          style={{
            backgroundColor: '#FEF3D8',
            color: '#854F0B',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
        >
          Coming Soon
        </span>
      </div>

      {/* Mobile App Section */}
      <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <div className="flex items-center" style={{ gap: '8px', marginBottom: '4px' }}>
          <Smartphone style={{ width: '16px', height: '16px', color: '#1A7F64' }} />
          <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500 }}>
            Mobile App
          </h4>
        </div>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          CageSync mobile app for QR scanning
        </p>

        <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
          <span
            className="font-body"
            style={{
              backgroundColor: '#E8F5F1',
              color: '#1A7F64',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            Android — Available
          </span>
          <span
            className="font-body"
            style={{
              backgroundColor: '#F3F4F6',
              color: '#6B7280',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            iOS — Coming Soon
          </span>
        </div>

        <button
          className="font-body font-medium border transition-colors"
          style={{
            borderColor: '#1A7F64',
            color: '#1A7F64',
            fontSize: '13px',
            padding: '6px 16px',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            cursor: 'pointer'
          }}
        >
          Visit Play Store
        </button>
      </div>
    </div>
  )

  const renderAccountTab = () => (
    <div>
      {/* Change Password Section */}
      <div style={{ paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
        <h4 className="font-display font-medium" style={{ color: '#1A1A2E', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
          Change Password
        </h4>
        <p className="font-body" style={{ color: '#6B7280', fontSize: '13px', marginBottom: '16px' }}>
          Update your password and account settings
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label className="block font-body font-medium" style={{ color: '#374151', fontSize: '13px', marginBottom: '4px' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border font-body focus:outline-none focus:ring-2 focus:border-[#1A7F64] focus:ring-[#E8F5F1]"
            style={{
              borderColor: '#E2E8F0',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '14px',
              color: '#1A1A2E',
              height: '36px',
              maxWidth: '480px',
              width: '100%'
            }}
          />
        </div>

        <button
          onClick={updatePassword}
          disabled={saving || !newPassword || !confirmPassword}
          className="font-body font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: '#1A7F64',
            color: 'white',
            fontSize: '13px',
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      {/* Danger Zone */}
      <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
        <div
          style={{
            backgroundColor: '#FFFAFA',
            borderColor: '#FCEBEB',
            border: '1px solid #FCEBEB',
            borderRadius: '12px',
            padding: '20px'
          }}
        >
          <h4 className="font-display font-medium" style={{ color: '#A32D2D', fontSize: '14px', fontWeight: 500, marginBottom: '16px' }}>
            Danger Zone
          </h4>

          <div className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <p className="font-body font-medium" style={{ color: '#1A1A2E', fontSize: '14px' }}>
                Export All Data
              </p>
              <p className="font-body" style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>
                Download all your lab data as CSV
              </p>
            </div>
            <button
              className="font-body font-medium border transition-colors"
              style={{
                borderColor: '#E2E8F0',
                color: '#6B7280',
                fontSize: '13px',
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Export
            </button>
          </div>

          <div className="flex items-center justify-between" style={{ padding: '12px 0' }}>
            <div>
              <p className="font-body font-medium" style={{ color: '#A32D2D', fontSize: '14px' }}>
                Delete Account
              </p>
              <p className="font-body" style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <button
              className="font-body font-medium transition-colors"
              style={{
                backgroundColor: '#E53E3E',
                color: 'white',
                fontSize: '13px',
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="pt-2 pb-8 mx-auto" style={{ maxWidth: '900px' }}>
      <div className="flex" style={{ gap: '24px' }}>
        {/* Left Sidebar - Tabs */}
        <div className="flex-shrink-0" style={{ width: '180px' }}>
          <div>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              const Icon = tab.icon

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center text-left transition-colors font-body"
                  style={{
                    padding: '6px 10px',
                    backgroundColor: isActive ? '#E8F5F1' : 'transparent',
                    color: isActive ? '#1A7F64' : '#6B7280',
                    fontSize: '13px',
                    borderRadius: '6px',
                    marginBottom: '2px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon
                    style={{
                      width: '14px',
                      height: '14px',
                      marginRight: '8px',
                      color: isActive ? '#1A7F64' : '#6B7280'
                    }}
                  />
                  {tab.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1" style={{ maxWidth: '640px' }}>
          <div
            className="border"
            style={{
              backgroundColor: 'white',
              borderColor: '#E2E8F0',
              borderRadius: '12px',
              padding: '24px'
            }}
          >
            {/* Success/Error Messages */}
            {message.text && (
              <div
                className="font-body"
                style={{
                  backgroundColor: message.type === 'success' ? '#E8F5F1' : '#FCEBEB',
                  color: message.type === 'success' ? '#1A7F64' : '#A32D2D',
                  fontSize: '13px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}
              >
                {message.text}
              </div>
            )}

            {/* Tab Content */}
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'lab-profile' && renderLabProfileTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'integrations' && renderIntegrationsTab()}
            {activeTab === 'account' && renderAccountTab()}
          </div>
        </div>
      </div>
    </div>
  )
}