'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Users,
  CheckCircle2,
  Info,
  ClipboardList,
  Check,
  X,
  CalendarClock,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduleSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  slotDuration: number
  isAvailable: boolean
  bookedCount: number
  totalSlots: number
  availableSlots: number
}

interface ScheduleRequest {
  id: string
  date: string
  startTime: string
  endTime: string
  slotDuration: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  staff: {
    id: string
    user: {
      firstName: string
      lastName: string
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekDates(weekOffset: number) {
  const now = new Date()
  const monday = new Date(now)
  const day = monday.getDay()
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toInputDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

// Format a UTC date string as a PHT date label
function formatDatePHT(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Status badge helper ───────────────────────────────────────────────────────

function RequestStatusBadge({ status }: { status: ScheduleRequest['status'] }) {
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
        <Clock className="h-2.5 w-2.5" /> Pending
      </span>
    )
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-[#2d7a2d]">
        <Check className="h-2.5 w-2.5" /> Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">
      <X className="h-2.5 w-2.5" /> Rejected
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const isStaff = session?.user?.role === 'STAFF'

  // ── Shared state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'schedule' | 'requests'>('schedule')

  // ── Staff / Admin schedule view state ─────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleSlot | null>(null)
  const [submittingDelete, setSubmittingDelete] = useState(false)

  // ── Staff: submit request state ────────────────────────────────────────────
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [requestForm, setRequestForm] = useState({
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: '30',
  })
  const [requestError, setRequestError] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // ── Staff: my requests tab ─────────────────────────────────────────────────
  const [myRequests, setMyRequests] = useState<ScheduleRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<ScheduleRequest | null>(null)
  const [submittingCancel, setSubmittingCancel] = useState(false)

  // ── Admin: all requests tab ────────────────────────────────────────────────
  const [allRequests, setAllRequests] = useState<ScheduleRequest[]>([])
  const [loadingAllRequests, setLoadingAllRequests] = useState(false)
  const [actionTarget, setActionTarget] = useState<{ request: ScheduleRequest; action: 'APPROVE' | 'REJECT' } | null>(null)
  const [submittingAction, setSubmittingAction] = useState(false)
  const [adminStaffFilter, setAdminStaffFilter] = useState<string>('ALL')
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('PENDING')

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]

  // ── Fetch approved schedule slots (for the calendar view) ──────────────────
  const fetchSchedule = useCallback(async () => {
    if (!session?.user) return
    setLoadingSlots(true)
    try {
      let staffId: string

      if (isAdmin) {
        // Admin sees all staff — fetch all slots for the week without staffId filter
        // We'll use a special admin endpoint or pass no staffId
        const from = toInputDate(weekStart)
        const to = toInputDate(weekEnd)
        const res = await fetch(`/api/schedule?from=${from}&to=${to}`)
        if (!res.ok) throw new Error('Failed to fetch schedule')
        setSlots(await res.json())
        return
      }

      const meRes = await fetch('/api/schedule/me')
      if (!meRes.ok) throw new Error('Failed to fetch staff info')
      const { staffId: sid } = await meRes.json()
      staffId = sid

      const from = toInputDate(weekStart)
      const to = toInputDate(weekEnd)
      const res = await fetch(`/api/schedule?staffId=${staffId}&from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Failed to fetch schedule')
      setSlots(await res.json())
    } catch {
      toast.error('Failed to load schedule')
    } finally {
      setLoadingSlots(false)
    }
  }, [weekOffset, session])

  // ── Fetch staff's own requests ─────────────────────────────────────────────
  const fetchMyRequests = useCallback(async () => {
    if (!isStaff) return
    setLoadingRequests(true)
    try {
      const res = await fetch('/api/schedule/requests')
      if (!res.ok) throw new Error('Failed to fetch requests')
      setMyRequests(await res.json())
    } catch {
      toast.error('Failed to load your requests')
    } finally {
      setLoadingRequests(false)
    }
  }, [isStaff])

  // ── Fetch all requests (admin) ─────────────────────────────────────────────
  const fetchAllRequests = useCallback(async () => {
    if (!isAdmin) return
    setLoadingAllRequests(true)
    try {
      const params = new URLSearchParams()
      if (adminStatusFilter !== 'ALL') params.set('status', adminStatusFilter)
      const res = await fetch(`/api/schedule/requests?${params}`)
      if (!res.ok) throw new Error('Failed to fetch requests')
      setAllRequests(await res.json())
    } catch {
      toast.error('Failed to load schedule requests')
    } finally {
      setLoadingAllRequests(false)
    }
  }, [isAdmin, adminStatusFilter])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])
  useEffect(() => { if (isStaff && activeTab === 'requests') fetchMyRequests() }, [fetchMyRequests, activeTab])
  useEffect(() => { if (isAdmin && activeTab === 'requests') fetchAllRequests() }, [fetchAllRequests, activeTab])

  // ── Staff: submit availability request ────────────────────────────────────
  const handleSubmitRequest = async () => {
    if (!selectedDate || !requestForm.startTime || !requestForm.endTime) {
      setRequestError('Please fill in all fields')
      return
    }
    setRequestError('')
    setSubmittingRequest(true)
    try {
      const res = await fetch('/api/schedule/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          startTime: requestForm.startTime,
          endTime: requestForm.endTime,
          slotDuration: parseInt(requestForm.slotDuration),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit request')
      }
      toast.success('Availability request submitted. The admin will review it shortly.')
      setShowRequestDialog(false)
      setSelectedDate('')
      setRequestForm({ startTime: '09:00', endTime: '17:00', slotDuration: '30' })
      fetchMyRequests()
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setSubmittingRequest(false)
    }
  }

  // ── Staff: cancel a pending request ───────────────────────────────────────
  const handleCancelRequest = async () => {
    if (!cancelTarget) return
    setSubmittingCancel(true)
    try {
      const res = await fetch(`/api/schedule/requests/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel request')
      }
      toast.success('Request cancelled.')
      setCancelTarget(null)
      fetchMyRequests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel request')
    } finally {
      setSubmittingCancel(false)
    }
  }

  // ── Admin: approve or reject a request ────────────────────────────────────
  const handleAdminAction = async () => {
    if (!actionTarget) return
    setSubmittingAction(true)
    try {
      const res = await fetch(`/api/schedule/requests/${actionTarget.request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionTarget.action }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${actionTarget.action.toLowerCase()} request`)
      }
      toast.success(
        actionTarget.action === 'APPROVE'
          ? 'Request approved. The schedule slot is now live.'
          : 'Request rejected. The staff member has been notified.'
      )
      setActionTarget(null)
      fetchAllRequests()
      // Also refresh calendar if we approved (new slot is now visible)
      if (actionTarget.action === 'APPROVE') fetchSchedule()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSubmittingAction(false)
    }
  }

  // ── Admin: delete an approved slot ────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmittingDelete(true)
    try {
      const res = await fetch(`/api/schedule/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete slot')
      const { cancelledCount } = data
      if (cancelledCount > 0) {
        toast.success(
          `Slot removed. ${cancelledCount} patient${cancelledCount > 1 ? 's have' : ' has'} been notified by email.`
        )
      } else {
        toast.success('Slot removed successfully.')
      }
      setDeleteTarget(null)
      setSelectedSlot(null)
      fetchSchedule()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete slot')
    } finally {
      setSubmittingDelete(false)
    }
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const getSlotsForDate = (date: Date) => {
    const dateStr = toInputDate(date)
    return slots.filter((s) => {
      const slotLocal = toInputDate(new Date(s.date))
      return slotLocal === dateStr
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const totalSlots = slots.reduce((a, s) => a + s.totalSlots, 0)
  const totalBooked = slots.reduce((a, s) => a + s.bookedCount, 0)
  const totalAvailable = slots.reduce((a, s) => a + s.availableSlots, 0)

  // Admin: unique staff names for filter dropdown
  const uniqueStaff = Array.from(
    new Map(
      allRequests.map((r) => [
        r.staff.id,
        `${r.staff.user.firstName} ${r.staff.user.lastName}`,
      ])
    ).entries()
  )

  const filteredAdminRequests = allRequests.filter((r) => {
    if (adminStaffFilter !== 'ALL' && r.staff.id !== adminStaffFilter) return false
    return true
  })

  const pendingCount = isAdmin
    ? allRequests.filter((r) => r.status === 'PENDING').length
    : myRequests.filter((r) => r.status === 'PENDING').length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isAdmin ? 'Schedule Management' : 'My Schedule'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isAdmin
              ? 'Review staff availability requests and manage approved schedule slots'
              : 'Submit availability requests and view your approved schedule'}
          </p>
        </div>

        {/* Staff: submit request button */}
        {isStaff && activeTab === 'requests' && (
          <Button
            onClick={() => {
              setSelectedDate(toInputDate(weekDates.find((d) => !isPast(d)) ?? weekDates[0]))
              setShowRequestDialog(true)
            }}
            className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl h-10 px-5 font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Availability
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-8">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'schedule'
                ? 'border-[#2d7a2d] text-[#2d7a2d]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {isAdmin ? 'Approved Schedules' : 'Approved Schedule'}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors relative ${
              activeTab === 'requests'
                ? 'border-[#2d7a2d] text-[#2d7a2d]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            {isAdmin ? 'Availability Requests' : 'My Requests'}
            {pendingCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-7xl mx-auto">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: APPROVED SCHEDULE (calendar view)                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'schedule' && (
          <>
            {/* Week stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Slots This Week', value: totalSlots, icon: Calendar, color: 'text-gray-600', bg: 'bg-gray-100' },
                { label: 'Appointments Booked', value: totalBooked, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Slots Still Available', value: totalAvailable, icon: CheckCircle2, color: 'text-[#2d7a2d]', bg: 'bg-[#2d7a2d]/10' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{loadingSlots ? '—' : stat.value}</p>
                    <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Week navigator */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  {MONTH_NAMES[weekStart.getMonth()]} {weekStart.getDate()} — {MONTH_NAMES[weekEnd.getMonth()]} {weekEnd.getDate()}, {weekEnd.getFullYear()}
                </span>
                {weekOffset === 0 && (
                  <Badge className="bg-[#2d7a2d] text-white text-xs px-2 py-0.5 rounded-full">This Week</Badge>
                )}
                {weekOffset !== 0 && (
                  <button onClick={() => setWeekOffset(0)} className="text-xs text-[#2d7a2d] font-medium hover:underline">
                    Back to today
                  </button>
                )}
              </div>

              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Calendar grid */}
            {loadingSlots ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="h-7 w-7 animate-spin text-[#2d7a2d]" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-3">
                {weekDates.map((date, i) => {
                  const daySlots = getSlotsForDate(date)
                  const past = isPast(date)
                  const today = isToday(date)

                  return (
                    <div
                      key={toInputDate(date)}
                      className={`rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col transition-all ${
                        today ? 'border-[#2d7a2d] ring-2 ring-[#2d7a2d]/20' : 'border-gray-100'
                      } ${past ? 'opacity-50' : ''}`}
                    >
                      {/* Day header */}
                      <div className={`px-3 py-3 text-center ${today ? 'bg-[#2d7a2d]' : 'bg-gray-50 border-b border-gray-100'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${today ? 'text-green-200' : 'text-gray-400'}`}>
                          {DAY_LABELS[i]}
                        </p>
                        <p className={`text-xl font-black ${today ? 'text-white' : 'text-gray-800'}`}>
                          {date.getDate()}
                        </p>
                        {today && <p className="text-[10px] text-green-200 font-semibold mt-0.5">Today</p>}
                      </div>

                      {/* Slot list */}
                      <div className="flex-1 p-2 space-y-2">
                        {daySlots.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-5 text-center">
                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                              <Clock className="h-3.5 w-3.5 text-gray-300" />
                            </div>
                            <p className="text-[10px] text-gray-300 font-medium">No slots</p>
                          </div>
                        ) : (
                          daySlots.map((slot) => {
                            const fillPct = slot.totalSlots > 0
                              ? Math.round((slot.bookedCount / slot.totalSlots) * 100)
                              : 0
                            const isFull = slot.bookedCount >= slot.totalSlots

                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className={`w-full text-left rounded-xl p-2.5 border transition-all hover:shadow-md active:scale-95 ${
                                  isFull
                                    ? 'bg-orange-50 border-orange-200'
                                    : 'bg-[#2d7a2d]/5 border-[#2d7a2d]/20 hover:bg-[#2d7a2d]/10'
                                }`}
                              >
                                <p className="text-[11px] font-bold text-gray-700 mb-1">
                                  {formatTime(slot.startTime)}
                                </p>
                                <p className="text-[10px] text-gray-400 mb-2">
                                  to {formatTime(slot.endTime)}
                                </p>

                                <div className="h-1 w-full rounded-full bg-gray-200 mb-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${isFull ? 'bg-orange-400' : 'bg-[#2d7a2d]'}`}
                                    style={{ width: `${fillPct}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-semibold ${isFull ? 'text-orange-600' : 'text-[#2d7a2d]'}`}>
                                    {slot.bookedCount}/{slot.totalSlots}
                                  </span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    isFull ? 'bg-orange-100 text-orange-600' : 'bg-[#2d7a2d]/10 text-[#2d7a2d]'
                                  }`}>
                                    {isFull ? 'Full' : 'Open'}
                                  </span>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 mt-5 justify-end">
              {[
                { color: 'bg-[#2d7a2d]/20 border-[#2d7a2d]/30', label: 'Available' },
                { color: 'bg-orange-100 border-orange-200', label: 'Fully booked' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded border ${item.color}`} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: REQUESTS — STAFF VIEW                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && isStaff && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Submit your availability and the admin will approve it before patients can book.
              </p>
            </div>

            {loadingRequests ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-7 w-7 animate-spin text-[#2d7a2d]" />
              </div>
            ) : myRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <CalendarClock className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No requests yet</p>
                <p className="text-sm text-gray-400 mt-1">Submit your first availability request to get started.</p>
                <Button
                  onClick={() => {
                    setSelectedDate(toInputDate(weekDates.find((d) => !isPast(d)) ?? weekDates[0]))
                    setShowRequestDialog(true)
                  }}
                  className="mt-4 bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl h-9 px-4 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Request Availability
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <CalendarClock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {formatDatePHT(req.date)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTime(req.startTime)} – {formatTime(req.endTime)} · {req.slotDuration} min slots
                      </p>
                    </div>
                    <RequestStatusBadge status={req.status} />
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => setCancelTarget(req)}
                        className="ml-2 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: REQUESTS — ADMIN VIEW                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'requests' && isAdmin && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select value={adminStatusFilter} onValueChange={(v) => setAdminStatusFilter(v)}>
                <SelectTrigger className="w-40 rounded-xl h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="ALL">All statuses</SelectItem>
                </SelectContent>
              </Select>

              {uniqueStaff.length > 0 && (
                <Select value={adminStaffFilter} onValueChange={(v) => setAdminStaffFilter(v)}>
                  <SelectTrigger className="w-48 rounded-xl h-9 text-sm">
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All staff</SelectItem>
                    {uniqueStaff.map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <span className="text-sm text-gray-400 ml-auto">
                {filteredAdminRequests.length} request{filteredAdminRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingAllRequests ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-7 w-7 animate-spin text-[#2d7a2d]" />
              </div>
            ) : filteredAdminRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <UserCheck className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No requests found</p>
                <p className="text-sm text-gray-400 mt-1">
                  {adminStatusFilter === 'PENDING'
                    ? 'All caught up! No pending requests to review.'
                    : 'No requests match the current filters.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAdminRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4"
                  >
                    {/* Staff avatar placeholder */}
                    <div className="h-10 w-10 rounded-full bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0 text-[#2d7a2d] font-bold text-sm">
                      {req.staff.user.firstName[0]}{req.staff.user.lastName[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">
                          {req.staff.user.firstName} {req.staff.user.lastName}
                        </p>
                        <RequestStatusBadge status={req.status} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDatePHT(req.date)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime(req.startTime)} – {formatTime(req.endTime)} · {req.slotDuration} min slots
                      </p>
                    </div>

                    {/* Actions — only show for PENDING */}
                    {req.status === 'PENDING' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => setActionTarget({ request: req, action: 'APPROVE' })}
                          className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl h-8 px-3 text-xs font-semibold"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionTarget({ request: req, action: 'REJECT' })}
                          className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-8 px-3 text-xs font-semibold"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Slot detail panel (admin/staff can remove slots) ────────────────── */}
      <AlertDialog open={!!selectedSlot} onOpenChange={(o) => { if (!o) setSelectedSlot(null) }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-[#2d7a2d]" />
              Slot Details
            </AlertDialogTitle>
          </AlertDialogHeader>
          {selectedSlot && (
            <div className="space-y-4 py-1">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(selectedSlot.date).toLocaleDateString('en-PH', {
                      timeZone: 'Asia/Manila',
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time window</span>
                  <span className="font-semibold text-gray-800">
                    {formatTime(selectedSlot.startTime)} – {formatTime(selectedSlot.endTime)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Slot duration</span>
                  <span className="font-semibold text-gray-800">{selectedSlot.slotDuration} min</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Bookings</span>
                  <span className="font-bold text-gray-800">
                    {selectedSlot.bookedCount} / {selectedSlot.totalSlots} filled
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedSlot.bookedCount >= selectedSlot.totalSlots ? 'bg-orange-400' : 'bg-[#2d7a2d]'
                    }`}
                    style={{
                      width: `${selectedSlot.totalSlots > 0
                        ? Math.round((selectedSlot.bookedCount / selectedSlot.totalSlots) * 100)
                        : 0}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedSlot.availableSlots} slot{selectedSlot.availableSlots !== 1 ? 's' : ''} still open for booking
                </p>
              </div>

              {selectedSlot.bookedCount > 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>
                    Removing this slot will <strong>cancel {selectedSlot.bookedCount} appointment{selectedSlot.bookedCount > 1 ? 's' : ''}</strong> and
                    notify the affected patient{selectedSlot.bookedCount > 1 ? 's' : ''} by email.
                  </span>
                </div>
              )}

              <Button
                onClick={() => { setDeleteTarget(selectedSlot); setSelectedSlot(null) }}
                className="w-full rounded-xl text-sm h-9 bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove Slot
              </Button>

              <button onClick={() => setSelectedSlot(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1">
                Close
              </button>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Staff: submit request dialog ────────────────────────────────────── */}
      <AlertDialog open={showRequestDialog} onOpenChange={(o) => { if (!o) { setShowRequestDialog(false); setRequestError('') } }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#2d7a2d]" />
              Request Availability
            </AlertDialogTitle>
            <AlertDialogDescription>
              Submit your preferred time window. The admin will review and approve it.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                min={toInputDate(new Date())}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={requestForm.startTime}
                  onChange={(e) => setRequestForm({ ...requestForm, startTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={requestForm.endTime}
                  onChange={(e) => setRequestForm({ ...requestForm, endTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {requestForm.startTime && requestForm.endTime && requestForm.startTime < requestForm.endTime && (
              <div className="bg-[#2d7a2d]/5 border border-[#2d7a2d]/20 rounded-xl px-4 py-3 text-sm text-[#2d7a2d]">
                <p className="font-semibold mb-1">
                  {formatTime(requestForm.startTime)} – {formatTime(requestForm.endTime)}
                </p>
                <p className="text-xs text-[#2d7a2d]/70">
                  {Math.floor(
                    (parseInt(requestForm.endTime.split(':')[0]) * 60 + parseInt(requestForm.endTime.split(':')[1]) -
                    (parseInt(requestForm.startTime.split(':')[0]) * 60 + parseInt(requestForm.startTime.split(':')[1]))) /
                    parseInt(requestForm.slotDuration)
                  )} patient slots · {requestForm.slotDuration} min each
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Appointment Duration</Label>
              <Select
                value={requestForm.slotDuration}
                onValueChange={(v) => setRequestForm({ ...requestForm, slotDuration: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes per patient</SelectItem>
                  <SelectItem value="30">30 minutes per patient</SelectItem>
                  <SelectItem value="45">45 minutes per patient</SelectItem>
                  <SelectItem value="60">1 hour per patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {requestError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{requestError}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={submittingRequest} className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              onClick={handleSubmitRequest}
              disabled={submittingRequest}
              className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl"
            >
              {submittingRequest && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submittingRequest ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Staff: cancel request confirmation ──────────────────────────────── */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null) }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {cancelTarget && (
                  <span>
                    This will withdraw your availability request for{' '}
                    <strong>{formatDatePHT(cancelTarget.date)}</strong>{' '}
                    from <strong>{formatTime(cancelTarget.startTime)}</strong> to{' '}
                    <strong>{formatTime(cancelTarget.endTime)}</strong>.
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={submittingCancel} className="rounded-xl">Keep it</AlertDialogCancel>
            <Button
              onClick={handleCancelRequest}
              disabled={submittingCancel}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {submittingCancel && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submittingCancel ? 'Cancelling...' : 'Cancel Request'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Admin: approve/reject confirmation ──────────────────────────────── */}
      <AlertDialog open={!!actionTarget} onOpenChange={(o) => { if (!o) setActionTarget(null) }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === 'APPROVE' ? 'Approve this request?' : 'Reject this request?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {actionTarget && (
                  <div className="space-y-3">
                    <span>
                      {actionTarget.action === 'APPROVE'
                        ? 'This will create an active schedule slot and notify the staff member.'
                        : 'The staff member will be notified that their request was not approved.'}
                    </span>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                      <p className="font-semibold text-gray-800">
                        {actionTarget.request.staff.user.firstName} {actionTarget.request.staff.user.lastName}
                      </p>
                      <p className="text-gray-500">{formatDatePHT(actionTarget.request.date)}</p>
                      <p className="text-gray-500">
                        {formatTime(actionTarget.request.startTime)} – {formatTime(actionTarget.request.endTime)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={submittingAction} className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              onClick={handleAdminAction}
              disabled={submittingAction}
              className={`rounded-xl text-white ${
                actionTarget?.action === 'APPROVE'
                  ? 'bg-[#2d7a2d] hover:bg-[#245f24]'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {submittingAction && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submittingAction
                ? actionTarget?.action === 'APPROVE' ? 'Approving...' : 'Rejecting...'
                : actionTarget?.action === 'APPROVE' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete slot confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this slot?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {deleteTarget && (
                  <span>
                    This will permanently remove the availability on{' '}
                    <strong>
                      {new Date(deleteTarget.date).toLocaleDateString('en-PH', {
                        timeZone: 'Asia/Manila',
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </strong>{' '}
                    from <strong>{formatTime(deleteTarget.startTime)}</strong> to{' '}
                    <strong>{formatTime(deleteTarget.endTime)}</strong>.
                  </span>
                )}
                {deleteTarget && deleteTarget.bookedCount > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <Info className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      <strong>{deleteTarget.bookedCount} appointment{deleteTarget.bookedCount > 1 ? 's' : ''}</strong> will be
                      automatically cancelled and the affected patient{deleteTarget.bookedCount > 1 ? 's' : ''} will be
                      notified by email.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={submittingDelete} className="rounded-xl">Cancel</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={submittingDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {submittingDelete && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submittingDelete ? 'Removing...' : 'Remove Slot'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}