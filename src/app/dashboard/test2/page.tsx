// app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import CalendarMeetings from '../components/CalendarMeetings'
import UnreadEmails from '../components/UnreadEmails'
import SyncDashboard from '../components/SyncDashboard'

export default async function DashboardPage() {
  const { userId } =await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <SyncDashboard />
  )
}