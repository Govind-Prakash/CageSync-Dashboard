import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QRGeneratorTool from '@/components/tools/qr-generator'

export default async function QRGeneratorPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile from Supabase
  // Note: For now we'll hardcode empty lab_name since lab setup isn't built yet
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const labName = '' // Will be profile?.lab_name when lab setup is implemented

  return (
    <div>
      <QRGeneratorTool
        labName={labName}
        userEmail={user.email}
      />
    </div>
  )
}