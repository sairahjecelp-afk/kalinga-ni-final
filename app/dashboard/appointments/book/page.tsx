'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CalendarCheck, Loader2, User, Calendar, Clock, ChevronRight, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SPECIALIZATIONS } from '@/lib/specializations'

const REASON_MAX = 300

interface ScheduleSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  slotDuration: number
}

interface Staff {
  id: string
  user: { firstName: string; lastName: string; email: string }
  specialization: string
  department: string | null
  schedules: ScheduleSlot[]
}

interface TimeSlot {
  time: string
  datetime: string
  available: boolean
  scheduleId: string
}

type Step = 'doctor' | 'date' | 'time' | 'reason'

export default function BookAppointmentPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('doctor')
  const [staff, setStaff] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [reason, setReason] = useState('')

  // Specialization filter for the doctor list
  const [filterSpec, setFilterSpec] = useState('ALL')

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/appointments')
        if (!res.ok) throw new Error('Failed to fetch doctors')
        const data = await res.json()
        setStaff(data)
      } catch {
        setError('Failed to load available doctors. Please try again.')
      } finally {
        setLoadingStaff(false)
      }
    }
    fetchStaff()
  }, [])

  useEffect(() => {
    if (!selectedStaff || !selectedDate) return
    const fetchSlots = async () => {
      setLoadingSlots(true)
      setTimeSlots([])
      setSelectedSlot(null)
      try {
        const res = await fetch(
          `/api/schedule/slots?staffId=${selectedStaff.id}&date=${selectedDate}`
        )
        if (!res.ok) throw new Error('Failed to fetch slots')
        const data = await res.json()
        setTimeSlots(data)
      } catch {
        setError('Failed to load time slots. Please try again.')
      } finally {
        setLoadingSlots(false)
      }
    }
    fetchSlots()
  }, [selectedStaff, selectedDate])

  const availableDates = selectedStaff
    ? selectedStaff.schedules.map((s) => s.date.split('T')[0])
    : []

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= REASON_MAX) setReason(e.target.value)
  }

  const charsLeft = REASON_MAX - reason.length
  const charsLeftColor =
    charsLeft <= 20 ? 'text-red-500' :
    charsLeft <= 50 ? 'text-amber-500' :
    'text-gray-400'

  const handleSubmit = async () => {
    if (!selectedStaff || !selectedSlot || !reason.trim()) {
      setError('Please complete all steps before booking.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          appointmentDate: selectedSlot.datetime,
          duration: selectedStaff.schedules.find(
            (s) => s.id === selectedSlot.scheduleId
          )?.slotDuration ?? 30,
          reason: reason.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to book appointment')
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard/appointments'), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment')
      setSubmitting(false)
    }
  }

  const steps: { key: Step; label: string; icon: typeof User }[] = [
    { key: 'doctor', label: 'Doctor', icon: User },
    { key: 'date',   label: 'Date',   icon: Calendar },
    { key: 'time',   label: 'Time',   icon: Clock },
    { key: 'reason', label: 'Reason', icon: CalendarCheck },
  ]

  const stepIndex = steps.findIndex((s) => s.key === step)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 === 0 ? 12 : h % 12
    return `${hour}:${String(m).padStart(2, '0')} ${period}`
  }

  // Derive the unique specializations actually present in the fetched staff list
  const availableSpecs = Array.from(new Set(staff.map(s => s.specialization))).sort()

  // Filtered doctor list
  const filteredStaff = filterSpec === 'ALL'
    ? staff
    : staff.filter(s => s.specialization === filterSpec)

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-green-100 p-5">
            <CalendarCheck className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Appointment Booked!</h2>
          <p className="text-foreground/60">Redirecting you to your appointments...</p>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Book an Appointment</h1>
          <p className="text-gray-500 text-sm">Schedule with one of our available doctors</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isCompleted = i < stepIndex
            const isCurrent = i === stepIndex
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                      isCompleted
                        ? 'bg-[#2d7a2d] text-white'
                        : isCurrent
                        ? 'bg-[#2d7a2d]/10 text-[#2d7a2d] ring-2 ring-[#2d7a2d]'
                        : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs mt-1 font-medium',
                    isCurrent ? 'text-[#2d7a2d]' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-2 mb-4 rounded',
                    i < stepIndex ? 'bg-[#2d7a2d]' : 'bg-gray-200'
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Summary bar */}
        {(selectedStaff || selectedDate || selectedSlot) && (
          <div className="mb-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-3 text-sm text-gray-600">
            {selectedStaff && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#2d7a2d]" />
                <span className="font-medium text-gray-800">
                  Dr. {selectedStaff.user.firstName} {selectedStaff.user.lastName}
                </span>
                <span className="text-gray-400 text-xs">· {selectedStaff.specialization}</span>
              </span>
            )}
            {selectedDate && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-300" />
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#2d7a2d]" />
                  {formatDate(selectedDate)}
                </span>
              </>
            )}
            {selectedSlot && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-300" />
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#2d7a2d]" />
                  {formatTime(selectedSlot.time)}
                </span>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* STEP 1 — Choose Doctor */}
        {step === 'doctor' && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800">Choose a Doctor</CardTitle>
              <CardDescription>Only doctors with available schedules are shown</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStaff ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2d7a2d]" />
                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No doctors have set their schedule yet.</p>
                  <p className="text-gray-300 text-xs mt-1">Please check back later.</p>
                </div>
              ) : (
                <>
                  {/* Specialization filter */}
                  {availableSpecs.length > 1 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setFilterSpec('ALL')}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                            filterSpec === 'ALL'
                              ? 'bg-[#2d7a2d] text-white border-[#2d7a2d]'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d7a2d] hover:text-[#2d7a2d]'
                          )}
                        >
                          All
                        </button>
                        {availableSpecs.map(spec => (
                          <button
                            key={spec}
                            onClick={() => setFilterSpec(spec)}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium border transition',
                              filterSpec === spec
                                ? 'bg-[#2d7a2d] text-white border-[#2d7a2d]'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d7a2d] hover:text-[#2d7a2d]'
                            )}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredStaff.length === 0 ? (
                    <div className="text-center py-8">
                      <Stethoscope className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No doctors available for this specialization.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredStaff.map((doctor) => (
                        <button
                          key={doctor.id}
                          onClick={() => {
                            setSelectedStaff(doctor)
                            setSelectedDate('')
                            setSelectedSlot(null)
                            setStep('date')
                            setError('')
                          }}
                          className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-[#2d7a2d] hover:bg-[#2d7a2d]/5 transition group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-[#2d7a2d]">
                                {doctor.user.firstName[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-800 text-sm">
                                Dr. {doctor.user.firstName} {doctor.user.lastName}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                                  {doctor.specialization}
                                </span>
                                {doctor.department && (
                                  <span className="text-xs text-gray-400">{doctor.department}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-[#2d7a2d] font-medium">
                                {doctor.schedules.length} available day{doctor.schedules.length !== 1 ? 's' : ''}
                              </p>
                              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#2d7a2d] ml-auto mt-1 transition" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — Choose Date */}
        {step === 'date' && selectedStaff && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800">Choose a Date</CardTitle>
              <CardDescription>
                Available dates for Dr. {selectedStaff.user.firstName} {selectedStaff.user.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {availableDates.map((dateStr) => {
                  const d = new Date(dateStr + 'T00:00:00')
                  const isSelected = selectedDate === dateStr
                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        setSelectedDate(dateStr)
                        setSelectedSlot(null)
                        setError('')
                      }}
                      className={cn(
                        'p-3 rounded-xl border text-left transition',
                        isSelected
                          ? 'bg-[#2d7a2d] border-[#2d7a2d] text-white'
                          : 'border-gray-100 hover:border-[#2d7a2d] hover:bg-[#2d7a2d]/5'
                      )}
                    >
                      <p className={cn('text-xs font-medium', isSelected ? 'text-white/80' : 'text-gray-400')}>
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className={cn('text-base font-bold', isSelected ? 'text-white' : 'text-gray-800')}>
                        {d.getDate()}
                      </p>
                      <p className={cn('text-xs', isSelected ? 'text-white/80' : 'text-gray-400')}>
                        {d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep('doctor'); setSelectedStaff(null) }}
                  className="rounded-xl border-gray-200"
                >
                  Back
                </Button>
                <Button
                  disabled={!selectedDate}
                  onClick={() => { setStep('time'); setError('') }}
                  className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — Choose Time Slot */}
        {step === 'time' && selectedStaff && selectedDate && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800">Choose a Time</CardTitle>
              <CardDescription>{formatDate(selectedDate)}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2d7a2d]" />
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No available slots for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time
                    return (
                      <button
                        key={slot.datetime}
                        disabled={!slot.available}
                        onClick={() => { setSelectedSlot(slot); setError('') }}
                        className={cn(
                          'py-2.5 px-3 rounded-xl border text-sm font-medium transition',
                          isSelected
                            ? 'bg-[#2d7a2d] border-[#2d7a2d] text-white'
                            : slot.available
                            ? 'border-gray-100 hover:border-[#2d7a2d] hover:bg-[#2d7a2d]/5 text-gray-700'
                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                        )}
                      >
                        {formatTime(slot.time)}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep('date'); setSelectedSlot(null) }}
                  className="rounded-xl border-gray-200"
                >
                  Back
                </Button>
                <Button
                  disabled={!selectedSlot}
                  onClick={() => { setStep('reason'); setError('') }}
                  className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 4 — Reason */}
        {step === 'reason' && (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-800">Reason for Visit</CardTitle>
              <CardDescription>Briefly describe why you need this appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reason">
                    Reason <span className="text-red-500">*</span>
                  </Label>
                  <span className={cn('text-xs font-medium tabular-nums', charsLeftColor)}>
                    {charsLeft} / {REASON_MAX}
                  </span>
                </div>
                <Textarea
                  id="reason"
                  placeholder="e.g. Routine check-up, follow-up for fever, etc."
                  value={reason}
                  onChange={handleReasonChange}
                  maxLength={REASON_MAX}
                  className="min-h-32 resize-none"
                />
                {charsLeft <= 20 && (
                  <p className="text-xs text-red-500">
                    {charsLeft === 0 ? 'Character limit reached.' : `${charsLeft} character${charsLeft !== 1 ? 's' : ''} remaining.`}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('time')}
                  disabled={submitting}
                  className="rounded-xl border-gray-200"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !reason.trim()}
                  className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}