'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, X, AlertCircle, UserX } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AppointmentActionsProps {
  appointmentId: string
  currentStatus: string
  userRole: string
  appointmentDate: Date | string
  duration?: number
}

export default function AppointmentActions({
  appointmentId,
  currentStatus,
  userRole,
  appointmentDate,
  duration = 30,
}: AppointmentActionsProps) {
  const router = useRouter()
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const apptStart = new Date(appointmentDate)
  const apptEnd = new Date(apptStart.getTime() + duration * 60 * 1000)
  const hoursUntilStart = (apptStart.getTime() - now.getTime()) / (1000 * 60 * 60)
  const appointmentFinished = now >= apptEnd

  const isStaffOrAdmin = userRole === 'STAFF' || userRole === 'ADMIN'

  // Only available after appointment has passed
  const canMarkComplete = appointmentFinished

  // No show — only staff/admin, only after appointment time has passed
  const canMarkNoShow = isStaffOrAdmin && appointmentFinished

  // Patients blocked within 48 hours; staff/admin can always cancel
  const CANCELLATION_HOURS = 48
  const canCancel =
    userRole !== 'PATIENT' || hoursUntilStart > CANCELLATION_HOURS

  const minutesUntilEnd = Math.ceil((apptEnd.getTime() - now.getTime()) / (1000 * 60))
  const hoursUntilEnd = Math.ceil((apptEnd.getTime() - now.getTime()) / (1000 * 60 * 60))

  const getCompleteTooltip = () => {
    if (appointmentFinished) return null
    if (minutesUntilEnd <= 60) return `Available in ~${minutesUntilEnd} minute${minutesUntilEnd !== 1 ? 's' : ''}`
    if (hoursUntilEnd <= 24) return `Available in ~${hoursUntilEnd} hour${hoursUntilEnd !== 1 ? 's' : ''}`
    return `Available after your appointment on ${apptEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const completeTooltip = getCompleteTooltip()
  const cancelTooltip =
    userRole === 'PATIENT' && !canCancel
      ? 'Cancellations must be made at least 48 hours in advance'
      : null
  const noShowTooltip = !appointmentFinished
    ? 'Available after the appointment time has passed'
    : null

  const handleStatusUpdate = async () => {
    if (!pendingStatus) return
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update appointment')
      }

      // ✅ Only close the dialog on success
      setPendingStatus(null)
      router.refresh()
    } catch (err) {
      // ✅ Keep dialog open and show the error message
      setError(err instanceof Error ? err.message : 'Failed to update appointment')
    } finally {
      setLoading(false)
    }
  }

  const dialogConfig: Record<string, { label: string; description: string; btnClass: string }> = {
    COMPLETED: {
      label: 'Mark as Completed',
      description: 'Are you sure you want to mark this appointment as completed?',
      btnClass: 'bg-[#2d7a2d] hover:bg-[#245f24] text-white',
    },
    CANCELLED: {
      label: 'Cancel Appointment',
      description: 'Are you sure you want to cancel this appointment? This cannot be undone.',
      btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
    NO_SHOW: {
      label: 'Mark as No Show',
      description: 'Are you sure you want to mark this patient as a no show?',
      btnClass: 'bg-gray-600 hover:bg-gray-700 text-white',
    },
  }

  const dialog = pendingStatus ? dialogConfig[pendingStatus] : null

  return (
    <>
      <TooltipProvider>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* Mark Complete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingStatus('COMPLETED')}
                  disabled={!canMarkComplete}
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </span>
            </TooltipTrigger>
            {completeTooltip && <TooltipContent><p>{completeTooltip}</p></TooltipContent>}
          </Tooltip>

          {/* No Show — staff/admin only */}
          {isStaffOrAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingStatus('NO_SHOW')}
                    disabled={!canMarkNoShow}
                    className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    No Show
                  </Button>
                </span>
              </TooltipTrigger>
              {noShowTooltip && <TooltipContent><p>{noShowTooltip}</p></TooltipContent>}
            </Tooltip>
          )}

          {/* Cancel */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingStatus('CANCELLED')}
                  disabled={!canCancel}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </span>
            </TooltipTrigger>
            {cancelTooltip && <TooltipContent><p>{cancelTooltip}</p></TooltipContent>}
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* ✅ FIX: Using Button instead of AlertDialogAction for the confirm button
          so the dialog does NOT auto-close before the async handler finishes.
          This keeps the dialog open on error so the message is visible. */}
      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => {
          if (!open && !loading) {
            setPendingStatus(null)
            setError('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.label}</AlertDialogTitle>
            <AlertDialogDescription>{dialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={loading}>Go Back</AlertDialogCancel>
            {/* ✅ Plain Button instead of AlertDialogAction — won't auto-close the dialog */}
            <Button
              onClick={handleStatusUpdate}
              disabled={loading}
              className={dialog?.btnClass}
            >
              {loading ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}