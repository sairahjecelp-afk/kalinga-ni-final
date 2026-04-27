'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FilePlus, AlertCircle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AddMedicalRecordProps {
  appointmentId: string
  patientId: string
  patientName: string
  appointmentDate: Date | string
  reason: string
  // Optional: called after successful save instead of router.refresh()
  // Used when this component is inside a non-Next.js-routed panel (e.g. patients page slide-in)
  onSuccess?: () => void
}

export default function AddMedicalRecord({
  appointmentId,
  patientId,
  patientName,
  appointmentDate,
  reason,
  onSuccess,
}: AddMedicalRecordProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    diagnosis: '',
    treatment: '',
    medications: '',
    notes: '',
  })

  const handleSubmit = async () => {
    if (!form.diagnosis.trim() || !form.treatment.trim()) {
      setError('Diagnosis and treatment are required')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          patientId,
          diagnosis: form.diagnosis.trim(),
          treatment: form.treatment.trim(),
          medications: form.medications.trim() || null,
          notes: form.notes.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save record')
      }

      setOpen(false)
      setForm({ diagnosis: '', treatment: '', medications: '', notes: '' })

      // If a custom callback is provided (e.g. from the patients slide-in panel),
      // use that instead of router.refresh() so the panel refreshes without a full page reload
      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save record')
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-[#2d7a2d] border-[#2d7a2d]/30 hover:bg-[#2d7a2d]/10 hover:text-[#2d7a2d] text-xs"
      >
        <FilePlus className="h-3.5 w-3.5 mr-1.5" />
        Add Record
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o && !loading) {
            setOpen(false)
            setError('')
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FilePlus className="h-5 w-5 text-[#2d7a2d]" />
              Add Medical Record
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-gray-700">{patientName}</span>
              <span className="text-gray-400 mx-1">·</span>
              {formattedDate}
              <span className="text-gray-400 mx-1">·</span>
              {reason}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Diagnosis <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Acute upper respiratory infection"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Treatment <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Describe the treatment provided..."
                value={form.treatment}
                onChange={(e) => setForm({ ...form, treatment: e.target.value })}
                className="resize-none min-h-24"
              />
            </div>

            <div className="space-y-2">
              <Label>Medications <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <Input
                placeholder="e.g. Amoxicillin 500mg, Paracetamol 500mg"
                value={form.medications}
                onChange={(e) => setForm({ ...form, medications: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Additional notes, follow-up instructions..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="resize-none min-h-20"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-[#2d7a2d] hover:bg-[#245f24] text-white"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                : 'Save Record'
              }
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}