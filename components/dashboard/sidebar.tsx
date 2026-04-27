'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, FileText, Users, LogOut,
  Menu, X, CalendarDays, Megaphone, Settings,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NotificationsBell } from '@/components/dashboard/notifications-bell'

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const role = (session?.user as any)?.role as string | undefined

  const menuItems = [
    { href: '/dashboard',                label: 'Dashboard',      icon: LayoutDashboard, roles: ['PATIENT', 'STAFF', 'ADMIN'] },
    { href: '/dashboard/announcements',  label: 'Announcements',  icon: Megaphone,       roles: ['PATIENT', 'STAFF', 'ADMIN'] },
    { href: '/dashboard/appointments',   label: 'Appointments',   icon: Calendar,        roles: ['PATIENT', 'STAFF'] },
    { href: '/dashboard/medical-records',label: 'Medical Records',icon: FileText,        roles: ['PATIENT'] },
    { href: '/dashboard/schedule',       label: 'Schedule',    icon: CalendarDays,    roles: ['STAFF', 'ADMIN'] },
    { href: '/dashboard/patients',       label: 'Patients',       icon: Users,           roles: ['STAFF', 'ADMIN'] },
    { href: '/dashboard/users',          label: 'Users',          icon: Users,           roles: ['ADMIN'] },
    { href: '/dashboard/settings',       label: 'Settings',       icon: Settings,        roles: ['PATIENT', 'STAFF', 'ADMIN'] },
  ]

  const filteredMenu = menuItems.filter(
    (item) => role && item.roles.includes(role)
  )

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' })
  }

  const roleLabel =
    role === 'PATIENT' ? 'Patient'
    : role === 'STAFF' ? 'Medical Staff'
    : role === 'ADMIN' ? 'Administrator'
    : 'User'

  const roleColor =
    role === 'PATIENT' ? 'bg-blue-100 text-blue-700'
    : role === 'STAFF' ? 'bg-green-100 text-[#2d7a2d]'
    : 'bg-gray-100 text-gray-700'

  // Show the bell only for patients and staff — not admins
  const showBell = role === 'PATIENT' || role === 'STAFF'

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-[#2d7a2d] text-white shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        'fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 shadow-sm transition-transform duration-300 ease-in-out flex flex-col',
        !isOpen && 'md:translate-x-0 -translate-x-full'
      )}>

        {/* Logo */}
        <Link href="/"
          className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 hover:bg-gray-50 transition">
          <Image src="/logo.jpg" alt="Kalinga-ni Logo" width={36} height={36} className="rounded-lg object-contain" />
          <div>
            <p className="font-bold text-[#2d7a2d] leading-tight">Kalinga-ni</p>
            <p className="text-[10px] text-gray-400 leading-tight">OPD Appointment System</p>
          </div>
        </Link>

        {/* User Info + Bell */}
        {session?.user && (
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            {/* Avatar + name — clickable to settings */}
            <Link href="/dashboard/settings" onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 rounded-xl p-1 -ml-1 transition">
              {(session.user as any).image ? (
                <Image src={(session.user as any).image} alt="Profile" width={36} height={36}
                  className="rounded-full object-cover h-9 w-9 flex-shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#2d7a2d]">
                    {session.user.name?.[0]?.toUpperCase() ?? 'U'}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {session.user.name || 'User'}
                </p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roleColor)}>
                  {roleLabel}
                </span>
              </div>
            </Link>

            {/* Bell — only for PATIENT and STAFF */}
            {showBell && <NotificationsBell />}
          </div>
        )}

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenu.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium',
                  isActive
                    ? 'bg-[#2d7a2d] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-[#2d7a2d]/8 hover:text-[#2d7a2d]'
                )}>
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'text-gray-400')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all">
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)} />
      )}
    </>
  )
}