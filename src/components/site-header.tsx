"use client"

import { SidebarIcon, RefreshCw, Calendar } from "lucide-react"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { SearchForm } from "@/components/search-form"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false)

  // Prevent hydration mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync calendar events only
  const syncCalendar = async () => {
    setIsCalendarSyncing(true)
    toast.loading('Syncing calendar...', { id: 'calendar-sync' })
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipEmbeddings: true, onlyCalendar: true })
      })
      
      const result = await response.json()
      if (result.success) {
        toast.success('Calendar sync completed!', { id: 'calendar-sync' })
      } else {
        const errorMsg = result.error || result.message || 'Unknown error occurred'
        if (errorMsg.includes('User not found') || errorMsg.includes('complete setup')) {
          toast.error('Please sign out and sign in again to complete your account setup.', { id: 'calendar-sync' })
        } else if (errorMsg.includes('authentication expired')) {
          toast.error('Google authentication expired. Please reconnect your account.', { id: 'calendar-sync' })
        } else {
          toast.error(`Calendar sync failed: ${errorMsg}`, { id: 'calendar-sync' })
        }
      }
      
    } catch (error) {
      console.error('Calendar sync request failed:', error)
      toast.error('Calendar sync request failed. Please try again.', { id: 'calendar-sync' })
    } finally {
      setIsCalendarSyncing(false)
    }
  }

  // Sync all data (emails and calendars)
  const syncAllData = async () => {
    setIsSyncing(true)
    toast.loading('Syncing emails and calendar...', { id: 'sync' })
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipEmbeddings: true })
      })
      
      const result = await response.json()
      if (result.success) {
        toast.success('Sync completed successfully!', { id: 'sync' })
      } else {
        // Better error messages for specific cases
        const errorMsg = result.error || result.message || 'Unknown error occurred'
        if (errorMsg.includes('User not found') || errorMsg.includes('complete setup')) {
          toast.error('Please sign out and sign in again to complete your account setup.', { id: 'sync' })
        } else if (errorMsg.includes('authentication expired')) {
          toast.error('Google authentication expired. Please reconnect your account.', { id: 'sync' })
        } else {
          toast.error(`Sync failed: ${errorMsg}`, { id: 'sync' })
        }
      }
      
    } catch (error) {
      console.error('Sync request failed:', error)
      toast.error('Sync request failed. Please try again.', { id: 'sync' })
    } finally {
      setIsSyncing(false)
    }
  }

  // Generate dynamic breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    if (!mounted) {
      // Return fallback breadcrumb during SSR/hydration
      return [{ label: 'Dashboard', href: '/dashboard', isLast: true }]
    }

    const pathSegments = pathname.split('/').filter(segment => segment !== '')
    
    if (pathSegments.length === 0) {
      return [{ label: 'Home', href: '/', isLast: true }]
    }

    const breadcrumbs = []
    let currentPath = ''

    // Add Home as first breadcrumb if not on home page
    breadcrumbs.push({ label: 'Home', href: '/', isLast: false })

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === pathSegments.length - 1
      
      // Capitalize and format segment names
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      breadcrumbs.push({
        label,
        href: currentPath,
        isLast
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="bg-background fixed top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.href} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {breadcrumb.isLast ? (
                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={breadcrumb.href}>
                      {breadcrumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
        <Button
          onClick={syncCalendar}
          disabled={isCalendarSyncing}
          variant="outline"
          size="sm"
          className="ml-2"
        >
          <Calendar className={`w-4 h-4 mr-1 ${isCalendarSyncing ? 'animate-spin' : ''}`} />
          Calendar
        </Button>
        <Button
          onClick={syncAllData}
          disabled={isSyncing}
          variant="outline"
          size="sm"
          className="ml-2"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync All
        </Button>
        <div className="ml-2">
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8"
              }
            }}
          />
        </div>
      </div>
    </header>
  )
}
