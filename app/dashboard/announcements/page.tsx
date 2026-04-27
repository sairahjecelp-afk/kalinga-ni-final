'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Megaphone,
  Pin,
  PinOff,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Author {
  id: string
  firstName: string
  lastName: string
  role: string
  image: string | null
}

interface Announcement {
  id: string
  title: string
  content: string
  audience: string
  isPinned: boolean
  isVisible: boolean
  createdAt: string
  updatedAt: string
  author: Author
}

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'Everyone',
  PATIENT: 'Patients only',
  STAFF: 'Staff only',
}

const AUDIENCE_COLORS: Record<string, string> = {
  ALL: 'bg-blue-100 text-blue-700',
  PATIENT: 'bg-green-100 text-[#2d7a2d]',
  STAFF: 'bg-purple-100 text-purple-700',
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const emptyForm = { title: '', content: '', audience: 'ALL', isPinned: false }

export default function AnnouncementsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const userId = (session?.user as any)?.id as string | undefined

  const canWrite = role === 'STAFF' || role === 'ADMIN'
  const isAdmin = role === 'ADMIN'

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Announcement | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/announcements')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAnnouncements(data)
    } catch {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const openCreate = () => {
    setEditTarget(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditTarget(a)
    setForm({
      title: a.title,
      content: a.content,
      audience: a.audience,
      isPinned: a.isPinned,
    })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      const isEdit = !!editTarget
      const url = isEdit ? `/api/announcements/${editTarget.id}` : '/api/announcements'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save announcement')
      }

      toast.success(isEdit ? 'Announcement updated' : 'Announcement posted')
      setShowForm(false)
      setEditTarget(null)
      fetchAnnouncements()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/announcements/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Announcement deleted')
      setDeleteTarget(null)
      fetchAnnouncements()
    } catch {
      toast.error('Failed to delete announcement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePin = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !a.isPinned }),
      })
      if (!res.ok) throw new Error()
      toast.success(a.isPinned ? 'Unpinned' : 'Pinned to top')
      fetchAnnouncements()
    } catch {
      toast.error('Failed to update pin')
    }
  }

  const handleToggleVisibility = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !a.isVisible }),
      })
      if (!res.ok) throw new Error()
      toast.success(a.isVisible ? 'Announcement hidden' : 'Announcement visible')
      fetchAnnouncements()
    } catch {
      toast.error('Failed to update visibility')
    }
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Announcements</h1>
          <p className="text-gray-500 text-sm">
            {canWrite ? 'Post and manage announcements for patients and staff' : 'Stay up to date with clinic news'}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={openCreate}
            className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2d7a2d]" />
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="h-12 w-12 text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium">No announcements yet</p>
            <p className="text-gray-300 text-sm mt-1">
              {canWrite ? 'Post your first announcement above.' : 'Check back later for updates.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const isOwner = a.author.id === userId
            const canEdit = isOwner || isAdmin
            const canDelete = isOwner || isAdmin

            return (
              <Card
                key={a.id}
                className={cn(
                  'border-0 shadow-sm rounded-2xl bg-white transition',
                  a.isPinned && 'ring-1 ring-[#2d7a2d]/30',
                  !a.isVisible && 'opacity-60'
                )}
              >
                <CardContent className="pt-5 pb-4">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Author avatar */}
                      <div className="h-9 w-9 rounded-full bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {a.author.image ? (
                          <img
                            src={a.author.image}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-[#2d7a2d]">
                            {a.author.firstName[0]}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          {a.isPinned && (
                            <Pin className="h-3.5 w-3.5 text-[#2d7a2d] flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-gray-800 text-sm leading-snug">
                            {a.title}
                          </h3>
                          {!a.isVisible && (
                            <Badge className="bg-gray-100 text-gray-500 text-xs">Hidden</Badge>
                          )}
                        </div>

                        {/* Author info */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          {a.author.role === 'ADMIN' ? (
                            <ShieldCheck className="h-3 w-3 text-gray-400" />
                          ) : (
                            <Stethoscope className="h-3 w-3 text-gray-400" />
                          )}
                          <span>
                            {a.author.role === 'ADMIN' ? 'Admin' : 'Dr.'}{' '}
                            {a.author.firstName} {a.author.lastName}
                          </span>
                          <span>·</span>
                          <span>{timeAgo(a.createdAt)}</span>
                          {a.updatedAt !== a.createdAt && (
                            <>
                              <span>·</span>
                              <span className="italic">edited</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Audience badge + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium hidden sm:inline-flex',
                          AUDIENCE_COLORS[a.audience]
                        )}
                      >
                        {AUDIENCE_LABELS[a.audience]}
                      </span>

                      {canEdit && (
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleTogglePin(a)}
                                title={a.isPinned ? 'Unpin' : 'Pin to top'}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#2d7a2d] hover:bg-[#2d7a2d]/10 transition"
                              >
                                {a.isPinned ? (
                                  <PinOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleToggleVisibility(a)}
                                title={a.isVisible ? 'Hide' : 'Show'}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                              >
                                {a.isVisible ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEdit(a)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(a)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap pl-12">
                    {a.content}
                  </p>

                  {/* Mobile audience badge */}
                  <div className="mt-3 pl-12 sm:hidden">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        AUDIENCE_COLORS[a.audience]
                      )}
                    >
                      {AUDIENCE_LABELS[a.audience]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <AlertDialog
        open={showForm}
        onOpenChange={(o) => {
          if (!o && !submitting) {
            setShowForm(false)
            setEditTarget(null)
            setError('')
          }
        }}
      >
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-[#2d7a2d]" />
              {editTarget ? 'Edit Announcement' : 'New Announcement'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editTarget
                ? 'Update the announcement details below.'
                : 'Fill in the details for your announcement.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Clinic closed on holiday"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Content <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Write your announcement here..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="min-h-28 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => setForm({ ...form, audience: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="PATIENT">Patients only</SelectItem>
                  <SelectItem value="STAFF">Staff only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={form.isPinned}
                  onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
                  className="h-4 w-4 accent-[#2d7a2d]"
                />
                <div>
                  <label htmlFor="isPinned" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Pin to top
                  </label>
                  <p className="text-xs text-gray-400">Pinned announcements always appear first</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#2d7a2d] hover:bg-[#245f24] text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submitting ? 'Saving...' : editTarget ? 'Save Changes' : 'Post'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !submitting) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {submitting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}