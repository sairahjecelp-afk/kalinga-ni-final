import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, AlertCircle, Calendar, User } from 'lucide-react'

export default async function MedicalRecordsPage() {
  const session = await auth()

  if (!session?.user) {
    return <div>Please log in</div>
  }

  if (session.user.role === 'ADMIN') {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Medical Records</h1>
        <Card className="mt-8 border-0 shadow-sm rounded-2xl">
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">You do not have access to this page</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  let records: any[] = []

  try {
    if (session.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({
        where: { userId: session.user.id as string },
      })

      if (patient) {
        records = await prisma.medicalRecord.findMany({
          where: { patientId: patient.id },
          include: {
            appointment: {
              include: {
                staff: {
                  include: { user: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      }

    } else if (session.user.role === 'STAFF') {
      // Only show records for this staff member's own patients
      const staff = await prisma.staff.findUnique({
        where: { userId: session.user.id as string },
      })

      if (staff) {
        records = await prisma.medicalRecord.findMany({
          where: {
            appointment: {
              staffId: staff.id,
            },
          },
          include: {
            patient: { include: { user: true } },
            appointment: {
              include: {
                staff: { include: { user: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      }
    }
  } catch (error) {
    console.error('Error fetching medical records:', error)
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Medical Records</h1>
        <p className="text-gray-500 text-sm">
          {session.user.role === 'PATIENT'
            ? 'Your complete medical history and treatment records'
            : "Medical records for your patients"}
        </p>
      </div>

      {records.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardContent className="pt-6 text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No medical records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5">
          {records.map(record => {
            const doctor = record.appointment?.staff?.user
            const patient = record.patient?.user

            return (
              <Card key={record.id} className="border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition">
                {/* Green top bar */}
                <div className="h-1.5 bg-[#2d7a2d] rounded-t-2xl" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-gray-800">{record.diagnosis}</CardTitle>
                      <p className="text-sm text-gray-400 mt-1">
                        {record.createdAt.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Patient name for staff view */}
                    {session.user.role === 'STAFF' && patient && (
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl">
                        <User className="h-3.5 w-3.5 text-[#1a5fa8]" />
                        <span className="text-sm font-medium text-[#1a5fa8]">
                          {patient.firstName} {patient.lastName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Doctor name for patient view */}
                  {session.user.role === 'PATIENT' && doctor && (
                    <div className="flex items-center gap-2 mt-2">
                      <User className="h-3.5 w-3.5 text-[#2d7a2d]" />
                      <span className="text-sm text-[#2d7a2d] font-medium">
                        Dr. {doctor.firstName} {doctor.lastName}
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  {/* Treatment */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Treatment</p>
                    <p className="text-gray-700 text-sm">{record.treatment}</p>
                  </div>

                  {/* Medications */}
                  {record.medications && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Medications</p>
                      <p className="text-gray-700 text-sm">{record.medications}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {record.notes && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-gray-700 text-sm">{record.notes}</p>
                    </div>
                  )}

                  {/* Related Appointment */}
                  {record.appointment && (
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <p className="text-xs text-gray-400">
                        Appointment on{' '}
                        <span className="font-medium text-gray-600">
                          {record.appointment.appointmentDate.toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </span>
                        {' — '}
                        {record.appointment.reason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}