import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, FileText, Users, Clock, ChevronRight, Activity } from 'lucide-react'

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export default async function DashboardPage() {
  const session = await auth()
  let totalMedicalRecords = 0
  let lastAppointment: any = null

  if (!session?.user) {
    return <div>Please log in</div>
  }

  let appointmentCount = 0
  let upcomingAppointments: any[] = []
  let userData: any = null

  try {
    if (session.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: session.user.id as string },
      })
      userData = patient

      if (patient) {
        const now = new Date()
        upcomingAppointments = await prisma.appointment.findMany({
          where: {
            patientId: patient.id,
            appointmentDate: { gte: now },
            status: 'SCHEDULED',
          },
          include: { staff: { include: { user: true } } },
          orderBy: { appointmentDate: 'asc' },
          take: 5,
        })
        appointmentCount = upcomingAppointments.length
        
        totalMedicalRecords = await prisma.medicalRecord.count({
          where: { patientId: patient.id },
        })

        lastAppointment = await prisma.appointment.findFirst({
          where: {
            patientId: patient.id,
            status: { in: ['COMPLETED', 'NO_SHOW'] },
          },
          orderBy: { appointmentDate: 'desc' },
        })
      }

    } else if (session.user.role === 'STAFF') {
      // ✅ Fix: look up Staff.id first
      const staff = await prisma.staff.findUnique({
        where: { userId: session.user.id as string },
        include: { user: true },
      })
      userData = staff

      if (staff) {
        const now = new Date()
        upcomingAppointments = await prisma.appointment.findMany({
          where: {
            staffId: staff.id,
            appointmentDate: { gte: now },
            status: 'SCHEDULED',
          },
          include: { patient: { include: { user: true } } },
          orderBy: { appointmentDate: 'asc' },
          take: 5,
        })

        appointmentCount = await prisma.appointment.count({
          where: { staffId: staff.id },
        })
      }

    } else if (session.user.role === 'ADMIN') {
      const totalUsers = await prisma.user.count()
      const totalPatients = await prisma.patient.count()
      const totalAppointments = await prisma.appointment.count()
      const totalRecords = await prisma.medicalRecord.count()
      
      // Add these new queries
      const activeUsers = await prisma.user.count({ where: { status: 'ACTIVE' } })
      const suspendedUsers = await prisma.user.count({ where: { status: 'SUSPENDED' } })
      const bannedUsers = await prisma.user.count({ where: { status: 'BANNED' } })
      const staffCount = await prisma.user.count({ where: { role: 'STAFF' } })
      const patientCount = await prisma.user.count({ where: { role: 'PATIENT' } })

      return (
        <div className="p-8 bg-gray-50 min-h-screen">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {session.user.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-[#2d7a2d]', bg: 'bg-[#2d7a2d]/10', desc: 'Active users in system' },
              { label: 'Patients', value: totalPatients, icon: Users, color: 'text-[#1a5fa8]', bg: 'bg-[#1a5fa8]/10', desc: 'Registered patients' },
              { label: 'Appointments', value: totalAppointments, icon: Calendar, color: 'text-[#2d7a2d]', bg: 'bg-[#2d7a2d]/10', desc: 'Total appointments' },
              { label: 'Medical Records', value: totalRecords, icon: FileText, color: 'text-[#1a5fa8]', bg: 'bg-[#1a5fa8]/10', desc: 'Records in system' },
            ].map((stat, i) => (
              <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white">
                <CardContent className="pt-6">
                  <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center mb-4', stat.bg)}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Account Status Breakdown */}
            <Card className="border-0 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-800 text-base">Account Status</CardTitle>
                <CardDescription className="text-xs text-gray-400">Breakdown of all user accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Active', value: activeUsers, color: 'bg-green-100 text-green-700' },
                  { label: 'Suspended', value: suspendedUsers, color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'Banned', value: bannedUsers, color: 'bg-red-100 text-red-700' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Role Breakdown */}
            <Card className="border-0 shadow-sm rounded-2xl bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-800 text-base">Users by Role</CardTitle>
                <CardDescription className="text-xs text-gray-400">Registered users per role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Patients', value: patientCount, color: 'bg-[#2d7a2d]/10 text-[#2d7a2d]' },
                  { label: 'Medical Staff', value: staffCount, color: 'bg-blue-100 text-blue-700' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <Link href="/dashboard/users">
                    <button className="text-xs text-[#2d7a2d] font-medium hover:underline flex items-center gap-1">
                      Manage Users <ChevronRight className="h-3 w-3" />
                    </button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
  } catch (error) {
    console.error('Dashboard error:', error)
  }

  // Patient Dashboard
  if (session.user.role === 'PATIENT') {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s an overview of your health information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="pt-6">
              <div className="h-11 w-11 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center mb-4">
                <Calendar className="h-5 w-5 text-[#2d7a2d]" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{appointmentCount}</div>
              <p className="text-sm font-medium text-gray-600">Upcoming Appointments</p>
              <p className="text-xs text-gray-400 mt-0.5">Scheduled appointments</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="pt-6">
              <div className="h-11 w-11 rounded-xl bg-[#1a5fa8]/10 flex items-center justify-center mb-4">
                <FileText className="h-5 w-5 text-[#1a5fa8]" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {totalMedicalRecords}
              </div>
              <p className="text-sm font-medium text-gray-600">Medical Records</p>
              <p className="text-xs text-gray-400 mt-0.5">Total records on file</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="pt-6">
              <div className="h-11 w-11 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center mb-4">
                <Clock className="h-5 w-5 text-[#2d7a2d]" />
              </div>
              <div className="text-sm font-bold text-gray-800 mb-1 mt-2">
                {lastAppointment
                  ? lastAppointment.appointmentDate.toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })
                  : 'None yet'}
              </div>
              <p className="text-sm font-medium text-gray-600">Last Visit</p>
              <p className="text-xs text-gray-400 mt-0.5">Most recent completed appointment</p>
            </CardContent>
          </Card>
        </div>

        {upcomingAppointments.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-800 text-base">Upcoming Appointments</CardTitle>
                  <CardDescription>Your next scheduled appointments</CardDescription>
                </div>
                <Link href="/dashboard/appointments">
                  <Button variant="ghost" size="sm" className="text-[#2d7a2d] hover:bg-[#2d7a2d]/10 text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map(apt => (
                  <div key={apt.id} className="flex items-start gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                    <div className="h-10 w-10 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-[#2d7a2d]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {apt.appointmentDate.toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })} at {apt.appointmentDate.toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{apt.reason}</p>
                      {apt.staff?.user && (
                        <p className="text-xs text-[#2d7a2d] font-medium mt-0.5">
                          Dr. {apt.staff.user.firstName} {apt.staff.user.lastName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/appointments/book">
            <Button className="w-full h-11 bg-[#2d7a2d] hover:bg-[#245f24] text-white font-semibold rounded-xl shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              Book New Appointment
            </Button>
          </Link>
          <Link href="/dashboard/appointments">
            <Button variant="outline" className="w-full h-11 border-gray-200 text-gray-700 hover:border-[#2d7a2d] hover:text-[#2d7a2d] rounded-xl font-semibold">
              <Clock className="h-4 w-4 mr-2" />
              View All Appointments
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Staff Dashboard
  if (session.user.role === 'STAFF') {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome, Dr. {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 mt-1">Manage your patients and appointments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="pt-6">
              <div className="h-11 w-11 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center mb-4">
                <Calendar className="h-5 w-5 text-[#2d7a2d]" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{appointmentCount}</div>
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-xs text-gray-400 mt-0.5">All time</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="pt-6">
              <div className="h-11 w-11 rounded-xl bg-[#1a5fa8]/10 flex items-center justify-center mb-4">
                <Clock className="h-5 w-5 text-[#1a5fa8]" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{upcomingAppointments.length}</div>
              <p className="text-sm font-medium text-gray-600">Upcoming</p>
              <p className="text-xs text-gray-400 mt-0.5">Scheduled appointments</p>
            </CardContent>
          </Card>
        </div>

        {upcomingAppointments.length > 0 && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-gray-800 text-base">Upcoming Appointments</CardTitle>
                  <CardDescription>Patients scheduled to see you</CardDescription>
                </div>
                <Link href="/dashboard/appointments">
                  <Button variant="ghost" size="sm" className="text-[#2d7a2d] hover:bg-[#2d7a2d]/10 text-xs">
                    View all <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map(apt => (
                  <div key={apt.id} className="flex items-start gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                    <div className="h-10 w-10 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-[#2d7a2d]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {apt.patient?.user?.firstName} {apt.patient?.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{apt.reason}</p>
                      <p className="text-xs text-[#2d7a2d] font-medium mt-0.5">
                        {apt.appointmentDate.toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })} at {apt.appointmentDate.toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/appointments">
            <Button className="w-full h-11 bg-[#2d7a2d] hover:bg-[#245f24] text-white font-semibold rounded-xl shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              View Appointments
            </Button>
          </Link>
          <Link href="/dashboard/patients">
            <Button variant="outline" className="w-full h-11 border-gray-200 text-gray-700 hover:border-[#2d7a2d] hover:text-[#2d7a2d] rounded-xl font-semibold">
              <Users className="h-4 w-4 mr-2" />
              Manage Patients
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return <div>Dashboard</div>
}