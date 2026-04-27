import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import AppointmentActions from '@/components/appointments/appointment-actions'
import AddMedicalRecord from '@/components/appointments/add-medical-record'

const PER_PAGE = 5

type Tab = 'upcoming' | 'completed' | 'cancelled'

const TAB_CONFIG: Record<Tab, { label: string; statuses: string[] }> = {
  upcoming:  { label: 'Upcoming',  statuses: ['SCHEDULED'] },
  completed: { label: 'Completed', statuses: ['COMPLETED', 'NO_SHOW'] },
  cancelled: { label: 'Cancelled', statuses: ['CANCELLED'] },
}

// The exact prefix written to appointment.notes when staff removes a slot
const STAFF_CANCELLATION_PREFIX = 'Cancelled: Staff removed their availability for this time slot'

function formatAppointmentDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatAppointmentTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Returns true if this appointment was cancelled because the staff removed
 * their availability slot (as opposed to a patient-initiated cancellation).
 */
function isStaffCancellation(notes: string | null): boolean {
  return !!notes && notes.includes(STAFF_CANCELLATION_PREFIX)
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    return <div>Please log in</div>
  }

  const { page: pageParam, tab: tabParam } = await searchParams
  const activeTab: Tab = (tabParam as Tab) in TAB_CONFIG ? (tabParam as Tab) : 'upcoming'
  const currentPage = Math.max(1, parseInt(pageParam ?? '1'))
  const skip = (currentPage - 1) * PER_PAGE
  const { statuses } = TAB_CONFIG[activeTab]
  const statusFilter = { status: { in: statuses } }

  let appointments: any[] = []
  let totalCount = 0

  try {
    if (session.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: session.user.id as string },
      })

      if (patient) {
        const where = { patientId: patient.id, ...statusFilter }
        ;[appointments, totalCount] = await Promise.all([
          prisma.appointment.findMany({
            where,
            include: { staff: { include: { user: true } }, medicalRecord: true },
            orderBy: { appointmentDate: activeTab === 'upcoming' ? 'asc' : 'desc' },
            skip,
            take: PER_PAGE,
          }),
          prisma.appointment.count({ where }),
        ])
      }

    } else if (session.user.role === 'STAFF') {
      const staff = await prisma.staff.findUnique({
        where: { userId: session.user.id as string },
      })

      if (staff) {
        const where = { staffId: staff.id, ...statusFilter }
        ;[appointments, totalCount] = await Promise.all([
          prisma.appointment.findMany({
            where,
            include: { patient: { include: { user: true } }, medicalRecord: true },
            orderBy: { appointmentDate: activeTab === 'upcoming' ? 'asc' : 'desc' },
            skip,
            take: PER_PAGE,
          }),
          prisma.appointment.count({ where }),
        ])
      }

    } else if (session.user.role === 'ADMIN') {
      const where = statusFilter
      ;[appointments, totalCount] = await Promise.all([
        prisma.appointment.findMany({
          where,
          include: {
            patient: { include: { user: true } },
            staff: { include: { user: true } },
            medicalRecord: true,
          },
          orderBy: { appointmentDate: activeTab === 'upcoming' ? 'asc' : 'desc' },
          skip,
          take: PER_PAGE,
        }),
        prisma.appointment.count({ where }),
      ])
    }
  } catch (error) {
    console.error('Error fetching appointments:', error)
  }

  const totalPages = Math.ceil(totalCount / PER_PAGE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':  return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':  return 'bg-green-100 text-green-800'
      case 'CANCELLED':  return 'bg-red-100 text-red-800'
      case 'NO_SHOW':    return 'bg-gray-100 text-gray-800'
      default:           return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Appointments</h1>
          <p className="text-gray-500 text-sm">Manage your appointment schedule</p>
        </div>
        {session.user.role === 'PATIENT' && (
          <Link href="/dashboard/appointments/book">
            <Button className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl">
              Book New Appointment
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(Object.entries(TAB_CONFIG) as [Tab, { label: string; statuses: string[] }][]).map(
          ([tab, { label }]) => (
            <Link key={tab} href={`?tab=${tab}&page=1`}>
              <button
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-[#2d7a2d] text-[#2d7a2d]'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            </Link>
          )
        )}
      </div>

      {/* Appointment list */}
      {appointments.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardContent className="pt-6 text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No {TAB_CONFIG[activeTab].label.toLowerCase()} appointments</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {appointments.map(apt => {
              const staffCancelled = isStaffCancellation(apt.notes)

              return (
                <Card
                  key={apt.id}
                  className={`border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition ${
                    staffCancelled ? 'ring-1 ring-red-200' : ''
                  }`}
                >
                  <CardContent className="pt-6">
                    {/* Staff-cancellation banner — message differs by role */}
                    {staffCancelled && session.user.role === 'PATIENT' && (
                      <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-red-700">
                            Appointment cancelled by clinic
                          </p>
                          <p className="text-xs text-red-600 mt-0.5">
                            The doctor removed their availability for this time slot. Please book a new appointment at your convenience.
                          </p>
                        </div>
                      </div>
                    )}
                    {staffCancelled && session.user.role === 'STAFF' && (
                      <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-700">
                          You removed your availability for this time slot.
                        </p>
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-[#2d7a2d]" />
                          <span className="font-semibold text-gray-800">
                            {formatAppointmentDate(apt.appointmentDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-[#1a5fa8]" />
                          <span className="text-gray-500 text-sm">
                            {formatAppointmentTime(apt.appointmentDate)}
                          </span>
                          <span className="text-gray-400 text-sm">({apt.duration} minutes)</span>
                        </div>
                        <p className="text-gray-700 text-sm mb-2">Reason: {apt.reason}</p>

                        {session.user.role === 'STAFF' && apt.patient ? (
                          <p className="text-gray-500 text-sm">
                            Patient: <span className="font-medium text-gray-700">{apt.patient.user.firstName} {apt.patient.user.lastName}</span>
                          </p>
                        ) : session.user.role !== 'STAFF' && apt.staff ? (
                          <p className="text-gray-500 text-sm">
                            Doctor: <span className="font-medium text-gray-700">Dr. {apt.staff.user.firstName} {apt.staff.user.lastName}</span>
                          </p>
                        ) : null}

                        {/* Only show raw notes if NOT a staff cancellation
                            (the banner above already communicates the reason to patients) */}
                        {apt.notes && !staffCancelled && (
                          <p className="text-gray-400 text-sm mt-2">Notes: {apt.notes}</p>
                        )}

                        {apt.medicalRecord && (
                          <p className="text-xs text-[#2d7a2d] font-medium mt-2">
                            ✓ Medical record on file
                          </p>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2 items-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>

                        {apt.status === 'SCHEDULED' && (
                          <AppointmentActions
                            appointmentId={apt.id}
                            currentStatus={apt.status}
                            userRole={session.user.role}
                            appointmentDate={apt.appointmentDate}
                            duration={apt.duration}
                          />
                        )}

                        {session.user.role === 'STAFF' &&
                          apt.status === 'COMPLETED' &&
                          !apt.medicalRecord && (
                            <AddMedicalRecord
                              appointmentId={apt.id}
                              patientId={apt.patientId}
                              patientName={`${apt.patient?.user?.firstName} ${apt.patient?.user?.lastName}`}
                              appointmentDate={apt.appointmentDate}
                              reason={apt.reason}
                            />
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {skip + 1}-{Math.min(skip + PER_PAGE, totalCount)} of {totalCount} appointments
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`?tab=${activeTab}&page=${currentPage - 1}`}
                  aria-disabled={currentPage <= 1}
                  className={currentPage <= 1 ? 'pointer-events-none' : ''}
                >
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} className="flex items-center gap-1 rounded-lg border-gray-200">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                </Link>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Link key={page} href={`?tab=${activeTab}&page=${page}`}>
                      <Button
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        className={`w-9 rounded-lg ${page === currentPage ? 'bg-[#2d7a2d] hover:bg-[#245f24] border-[#2d7a2d]' : 'border-gray-200'}`}
                      >
                        {page}
                      </Button>
                    </Link>
                  ))}
                </div>

                <Link
                  href={`?tab=${activeTab}&page=${currentPage + 1}`}
                  aria-disabled={currentPage >= totalPages}
                  className={currentPage >= totalPages ? 'pointer-events-none' : ''}
                >
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="flex items-center gap-1 rounded-lg border-gray-200">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}