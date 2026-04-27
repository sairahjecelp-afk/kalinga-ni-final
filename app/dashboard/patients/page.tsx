'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, Phone, UserRound, Calendar, FileText,
  X, ChevronRight, AlertCircle, Stethoscope, Clock,
  Search, Droplets, ShieldAlert, History, Ruler, Weight,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import AddMedicalRecord from '@/components/appointments/add-medical-record'

type Patient = {
  id: string
  userId: string
  dateOfBirth: string | null
  gender: string | null
  bloodType: string | null
  height: number | null  // cm
  weight: number | null  // kg
  allergies: string | null
  createdAt: string
  user: {
    firstName: string
    lastName: string
    email: string
    phone: string | null
    status: string
  }
  _count: {
    appointments: number
    medicalRecords: number
  }
}

type Appointment = {
  id: string
  patientId: string
  appointmentDate: string
  duration: number
  reason: string
  status: string
  notes: string | null
  staff: { user: { firstName: string; lastName: string } }
  medicalRecord: { id: string } | null
}

type MedicalRecord = {
  id: string
  diagnosis: string
  treatment: string
  medications: string | null
  notes: string | null
  createdAt: string
  appointment: {
    appointmentDate: string
    reason: string
    staff: { user: { firstName: string; lastName: string } }
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
  NO_SHOW:    'bg-gray-100 text-gray-500',
}

const NOT_PROVIDED: Record<string, string> = {
  gender:      'Not provided by patient',
  dateOfBirth: 'Not provided by patient',
  phone:       'Not provided by patient',
  bloodType:   'Not recorded',
  height:      'Not provided by patient',
  weight:      'Not provided by patient',
  allergies:   'No known allergies on record',
}

function NotProvided({ field }: { field: keyof typeof NOT_PROVIDED }) {
  return <span className="text-gray-300 italic text-sm">{NOT_PROVIDED[field]}</span>
}

function bmiLabel(height: number, weight: number) {
  const bmi = weight / Math.pow(height / 100, 2)
  const rounded = bmi.toFixed(1)
  if (bmi < 18.5) return `${rounded} (Underweight)`
  if (bmi < 25)   return `${rounded} (Normal)`
  if (bmi < 30)   return `${rounded} (Overweight)`
  return `${rounded} (Obese)`
}

export default function PatientsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined

  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState<Patient | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'records'>('history')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { fetchPatients() }, [])

  async function fetchPatients() {
    setLoading(true)
    const res = await fetch('/api/admin/patients')
    if (res.ok) setPatients(await res.json())
    setLoading(false)
  }

  async function openPatient(patient: Patient) {
    setSelected(patient)
    setActiveTab('history')
    setDetailLoading(true)
    const [aptRes, recRes] = await Promise.all([
      fetch(`/api/admin/patients/${patient.id}/appointments`),
      fetch(`/api/admin/patients/${patient.id}/records`),
    ])
    if (aptRes.ok) setAppointments(await aptRes.json())
    if (recRes.ok) setRecords(await recRes.json())
    setDetailLoading(false)
  }

  function closePanel() {
    setSelected(null)
    setAppointments([])
    setRecords([])
  }

  async function refreshDetail() {
    if (!selected) return
    const [aptRes, recRes] = await Promise.all([
      fetch(`/api/admin/patients/${selected.id}/appointments`),
      fetch(`/api/admin/patients/${selected.id}/records`),
    ])
    if (aptRes.ok) setAppointments(await aptRes.json())
    if (recRes.ok) setRecords(await recRes.json())
    fetchPatients()
  }

  const filtered = patients.filter(p =>
    `${p.user.firstName} ${p.user.lastName} ${p.user.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  if (!role || !['STAFF', 'ADMIN'].includes(role)) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <Card className="mt-8 border-0 shadow-sm rounded-2xl">
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">You do not have access to this page</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Patients</h1>
        <p className="text-gray-500 text-sm">
          {role === 'ADMIN'
            ? 'All registered patients — click to view appointments and records'
            : 'Your patients — click to view their history and medical records'}
        </p>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d7a2d]/30"
          />
        </div>
      </div>

      {/* Patient List */}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading patients...</p>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardContent className="pt-6 text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No patients found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(patient => (
            <div
              key={patient.id}
              onClick={() => openPatient(patient)}
              className={`bg-white rounded-2xl shadow-sm border-0 overflow-hidden transition cursor-pointer hover:shadow-md ${
                selected?.id === patient.id ? 'ring-2 ring-[#2d7a2d]' : ''
              }`}
            >
              <div className="h-1.5 bg-[#2d7a2d]" />
              <div className="p-5">
                {/* Patient header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-[#2d7a2d]">
                        {patient.user.firstName[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">
                        {patient.user.firstName} {patient.user.lastName}
                      </p>
                      <p className="text-sm text-gray-400">{patient.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {patient._count.appointments} Appointments
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#2d7a2d]/10 text-[#2d7a2d] font-medium">
                      {patient._count.medicalRecords} Records
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300 ml-1" />
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: UserRound, label: 'Gender',       field: 'gender' as const,      value: patient.gender },
                    {
                      icon: Calendar,
                      label: 'Date of Birth',
                      field: 'dateOfBirth' as const,
                      value: patient.dateOfBirth
                        ? new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })
                        : null,
                    },
                    { icon: Phone,    label: 'Phone',      field: 'phone' as const,     value: patient.user.phone },
                    { icon: Droplets, label: 'Blood Type', field: 'bloodType' as const, value: patient.bloodType },
                    { icon: Ruler,    label: 'Height',     field: 'height' as const,    value: patient.height != null ? `${patient.height} cm` : null },
                    { icon: Weight,   label: 'Weight',     field: 'weight' as const,    value: patient.weight != null ? `${patient.weight} kg` : null },
                  ].map(({ icon: Icon, label, field, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        {value
                          ? <p className="text-sm font-medium text-gray-700">{value}</p>
                          : <NotProvided field={field} />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Allergies row */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Allergies</p>
                    {patient.allergies
                      ? <p className="text-sm font-medium text-amber-700">{patient.allergies}</p>
                      : <p className="text-sm italic text-gray-300">{NOT_PROVIDED.allergies}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Slide-in Panel */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={closePanel}
          />

          <div className="fixed right-0 top-0 h-full w-full max-w-2xl z-50 bg-white shadow-2xl flex flex-col">

            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#2d7a2d]/10 flex items-center justify-center">
                  <span className="font-bold text-[#2d7a2d]">
                    {selected.user.firstName[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-800">
                    {selected.user.firstName} {selected.user.lastName}
                  </p>
                  <p className="text-xs text-gray-400">{selected.user.email}</p>
                </div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-xl hover:bg-gray-100 transition">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Patient quick-info strip */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 space-y-3">

              {/* Row 1: basic demographics */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5 text-gray-300" />
                  {selected.gender || <span className="italic text-gray-300">{NOT_PROVIDED.gender}</span>}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-300" />
                  {selected.dateOfBirth
                    ? new Date(selected.dateOfBirth).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })
                    : <span className="italic text-gray-300">{NOT_PROVIDED.dateOfBirth}</span>}
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-gray-300" />
                  {selected.bloodType || <span className="italic text-gray-300">{NOT_PROVIDED.bloodType}</span>}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-gray-300" />
                  {selected.user.phone || <span className="italic text-gray-300">{NOT_PROVIDED.phone}</span>}
                </span>
              </div>

              {/* Row 2: height / weight / BMI */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5 flex items-center gap-1">
                    <Ruler className="h-3 w-3" /> Height
                  </p>
                  {selected.height != null
                    ? <p className="text-sm font-semibold text-gray-700">{selected.height} cm</p>
                    : <p className="text-xs italic text-gray-300">{NOT_PROVIDED.height}</p>}
                </div>
                <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5 flex items-center gap-1">
                    <Weight className="h-3 w-3" /> Weight
                  </p>
                  {selected.weight != null
                    ? <p className="text-sm font-semibold text-gray-700">{selected.weight} kg</p>
                    : <p className="text-xs italic text-gray-300">{NOT_PROVIDED.weight}</p>}
                </div>
                <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">BMI</p>
                  {selected.height != null && selected.weight != null
                    ? <p className="text-sm font-semibold text-gray-700">{bmiLabel(selected.height, selected.weight)}</p>
                    : <p className="text-xs italic text-gray-300">Not enough data</p>}
                </div>
              </div>

              {/* Row 3: allergies */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-0.5">Allergies</p>
                  {selected.allergies
                    ? <p className="text-xs font-medium text-amber-800">{selected.allergies}</p>
                    : <p className="text-xs italic text-amber-400">{NOT_PROVIDED.allergies}</p>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                  activeTab === 'history'
                    ? 'border-[#2d7a2d] text-[#2d7a2d]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <History className="h-4 w-4" />
                History
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                  {appointments.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('records')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                  activeTab === 'records'
                    ? 'border-[#2d7a2d] text-[#2d7a2d]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <FileText className="h-4 w-4" />
                Medical Records
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                  {records.length}
                </span>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-gray-400 text-sm">Loading...</p>
                </div>
              ) : activeTab === 'history' ? (
                appointments.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No appointment history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map(apt => (
                      <div key={apt.id} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {new Date(apt.appointmentDate).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric',
                                month: 'short', day: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(apt.appointmentDate).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit',
                              })}
                              <span className="text-gray-300">·</span>
                              {apt.duration} min
                            </p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[apt.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {apt.status}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{apt.reason}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-gray-300" />
                            <p className="text-xs text-gray-400">
                              Dr. {apt.staff.user.firstName} {apt.staff.user.lastName}
                            </p>
                            {apt.medicalRecord && (
                              <span className="ml-2 text-xs text-[#2d7a2d] font-medium">
                                ✓ Has record
                              </span>
                            )}
                          </div>

                          {role === 'STAFF' &&
                            apt.status === 'COMPLETED' &&
                            !apt.medicalRecord && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <AddMedicalRecord
                                  appointmentId={apt.id}
                                  patientId={apt.patientId}
                                  patientName={`${selected.user.firstName} ${selected.user.lastName}`}
                                  appointmentDate={new Date(apt.appointmentDate)}
                                  reason={apt.reason}
                                  onSuccess={refreshDetail}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                records.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No medical records found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {records.map(rec => (
                      <div key={rec.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <div className="h-1 bg-[#2d7a2d]" />
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <p className="font-semibold text-gray-800">{rec.diagnosis}</p>
                            <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {new Date(rec.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Treatment</p>
                              <p className="text-sm text-gray-700">{rec.treatment}</p>
                            </div>
                            {rec.medications && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Medications</p>
                                <p className="text-sm text-gray-700">{rec.medications}</p>
                              </div>
                            )}
                            {rec.notes && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                                <p className="text-sm text-gray-700">{rec.notes}</p>
                              </div>
                            )}
                          </div>
                          {rec.appointment && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                              <Stethoscope className="h-3.5 w-3.5 text-gray-300" />
                              <p className="text-xs text-gray-400">
                                Dr. {rec.appointment.staff.user.firstName} {rec.appointment.staff.user.lastName}
                                <span className="text-gray-300 mx-1">·</span>
                                {new Date(rec.appointment.appointmentDate).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}