'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  User, Lock, Trash2, Camera,
  AlertCircle, Check, Loader2, ShieldAlert, FileText, ChevronRight,
  Building2, Bell, Scale,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SPECIALIZATIONS } from '@/lib/specializations'

// ── Types ──────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  image: string | null
  role: string
  createdAt: string
  patient?: {
    dateOfBirth: string | null
    gender: string | null
    bloodType: string | null
    height: number | null
    weight: number | null
    allergies: string | null
    emergencyContact: string | null
    emergencyPhone: string | null
  }
  staff?: {
    specialization: string
    licenseNumber: string | null
    department: string | null
  }
}

interface UserSettings {
  theme: string
  language: string
  emailNotifications: boolean
  phoneNotifications: boolean
  appNotifications: boolean
}

interface ClinicSettings {
  id: string
  clinicName: string
  clinicEmail: string
  clinicPhone: string
  clinicAddress: string
  clinicCity: string
  clinicZipCode: string
  operatingHours: string
}

interface AppointmentSettings {
  id: string
  cancellationWindowHours: number
  maxAppointmentsPerDay: number
  defaultSlotDuration: number
  bookingsEnabled: boolean
}

// ── Constants ──────────────────────────────────────────────────────────────
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS     = ['Male', 'Female', 'Other', 'Prefer not to say']

// ── Toggle ─────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2d7a2d] focus:ring-offset-2 disabled:opacity-50',
        checked ? 'bg-[#2d7a2d]' : 'bg-gray-200'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const role             = (session?.user as any)?.role as string | undefined
  const isAdmin          = role === 'ADMIN'
  const isPatientOrStaff = role === 'PATIENT' || role === 'STAFF'
  const fileInputRef     = useRef<HTMLInputElement>(null)

  const TABS = [
    { key: 'profile',       label: 'Profile',       icon: User,        roles: ['PATIENT', 'STAFF', 'ADMIN'] },
    { key: 'security',      label: 'Security',      icon: Lock,        roles: ['PATIENT', 'STAFF', 'ADMIN'] },
    { key: 'notifications', label: 'Notifications', icon: Bell,        roles: ['PATIENT', 'STAFF'] },
    { key: 'clinic',        label: 'Clinic',        icon: Building2,   roles: ['ADMIN'] },
    { key: 'legal',         label: 'Legal',         icon: Scale,       roles: ['PATIENT', 'STAFF', 'ADMIN'] },
    { key: 'danger',        label: 'Account',       icon: ShieldAlert, roles: ['PATIENT', 'STAFF', 'ADMIN'] },
  ].filter(t => role && t.roles.includes(role))

  const [activeTab,      setActiveTab]      = useState('profile')
  const [profile,        setProfile]        = useState<UserProfile | null>(null)
  const [settings,       setSettings]       = useState<UserSettings | null>(null)
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null)
  const [apptSettings,   setApptSettings]   = useState<AppointmentSettings | null>(null)
  const [loading,        setLoading]        = useState(true)

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', phone: '',
    dateOfBirth: '', gender: '', bloodType: '', height: '', weight: '', allergies: '',
    emergencyContact: '', emergencyPhone: '',
    specialization: '', licenseNumber: '', department: '',
  })

  // Track whether the staff picked "Other" from the dropdown
  const [specializationMode, setSpecializationMode] = useState<'select' | 'other'>('select')
  const [otherSpecialization, setOtherSpecialization] = useState('')

  const [avatarPreview,   setAvatarPreview]   = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingProfile,   setSavingProfile]   = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError,  setPasswordError]  = useState('')

  const [savingSettings, setSavingSettings] = useState(false)

  const [clinicForm, setClinicForm] = useState({
    clinicName: '', clinicEmail: '', clinicPhone: '',
    clinicAddress: '', clinicCity: '', clinicZipCode: '', operatingHours: '',
  })
  const [savingClinic, setSavingClinic] = useState(false)

  const [showDeleteDialog,  setShowDeleteDialog]  = useState(false)
  const [deletePassword,    setDeletePassword]    = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount,   setDeletingAccount]   = useState(false)
  const [deleteError,       setDeleteError]       = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const requests: Promise<Response>[] = [fetch('/api/user/profile'), fetch('/api/user/settings')]
      if (isAdmin) requests.push(fetch('/api/settings'))

      const responses = await Promise.all(requests)
      const [profileData, settingsData] = await Promise.all([
        responses[0].json(),
        responses[1].json(),
      ])

      setProfile(profileData)
      setSettings(settingsData)
      setAvatarPreview(profileData.image ?? null)

      const savedSpec = profileData.staff?.specialization ?? ''
      const isKnown   = (SPECIALIZATIONS as readonly string[]).includes(savedSpec)

      setProfileForm({
        firstName:        profileData.firstName ?? '',
        lastName:         profileData.lastName ?? '',
        phone:            profileData.phone ?? '',
        dateOfBirth:      profileData.patient?.dateOfBirth?.split('T')[0] ?? '',
        gender:           profileData.patient?.gender ?? '',
        bloodType:        profileData.patient?.bloodType ?? '',
        height:           profileData.patient?.height?.toString() ?? '',
        weight:           profileData.patient?.weight?.toString() ?? '',
        allergies:        profileData.patient?.allergies ?? '',
        emergencyContact: profileData.patient?.emergencyContact ?? '',
        emergencyPhone:   profileData.patient?.emergencyPhone ?? '',
        specialization:   isKnown ? savedSpec : 'Other',
        licenseNumber:    profileData.staff?.licenseNumber ?? '',
        department:       profileData.staff?.department ?? '',
      })

      if (savedSpec && !isKnown) {
        setSpecializationMode('other')
        setOtherSpecialization(savedSpec)
      } else {
        setSpecializationMode(savedSpec === 'Other' ? 'other' : 'select')
        setOtherSpecialization('')
      }

      if (isAdmin && responses[2]) {
        const adminData = await responses[2].json()
        const c = adminData.clinic; const a = adminData.appointments
        setClinicSettings(c); setApptSettings(a)
        setClinicForm({
          clinicName:     c.clinicName ?? '',
          clinicEmail:    c.clinicEmail ?? '',
          clinicPhone:    c.clinicPhone ?? '',
          clinicAddress:  c.clinicAddress ?? '',
          clinicCity:     c.clinicCity ?? '',
          clinicZipCode:  c.clinicZipCode ?? '',
          operatingHours: c.operatingHours ?? '',
        })
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('File must be an image'); return }

    const localPreview = URL.createObjectURL(file)
    setAvatarPreview(localPreview)
    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Upload failed') }
      const { url } = await res.json()
      setAvatarPreview(url)
      await updateSession({ image: url })
      toast.success('Profile picture updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo')
      setAvatarPreview(profile?.image ?? null)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/user/avatar', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove photo')
      setAvatarPreview(null)
      await updateSession({ image: null })
      toast.success('Profile picture removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove photo')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async () => {
    // Resolve the actual specialization value to save
    const resolvedSpecialization =
      specializationMode === 'other'
        ? otherSpecialization.trim()
        : profileForm.specialization

    if (role === 'STAFF' && !resolvedSpecialization) {
      toast.error('Please enter your specialization')
      return
    }

    setSavingProfile(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileForm,
          specialization: resolvedSpecialization,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const data = await res.json()
      await updateSession({ name: data.name })
      toast.success('Profile updated')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    setPasswordError('')
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required'); return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match'); return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters'); return
    }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSaveSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return
    setSavingSettings(true)
    setSettings({ ...settings, ...updates })
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      toast.success('Preferences saved')
    } catch {
      toast.error('Failed to save preferences')
      fetchData()
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSaveClinic = async () => {
    setSavingClinic(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: 'clinic', data: clinicForm }),
      })
      if (!res.ok) throw new Error()
      toast.success('Clinic information saved')
    } catch {
      toast.error('Failed to save clinic settings')
    } finally {
      setSavingClinic(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError('')
    if (deleteConfirmText !== 'DELETE') { setDeleteError('Please type DELETE to confirm'); return }
    if (!deletePassword) { setDeleteError('Password is required'); return }
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('Account deleted. Signing out...')
      await signOut({ redirect: true, callbackUrl: '/' })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setDeletingAccount(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-[#2d7a2d]" />
    </div>
  )

  const initials = `${profileForm.firstName?.[0] ?? ''}${profileForm.lastName?.[0] ?? ''}`.toUpperCase() || 'U'

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account and preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Tab Nav */}
          <div className="md:w-52 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon; const isActive = activeTab === tab.key
                return (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                      isActive ? 'bg-[#2d7a2d] text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-[#2d7a2d]'
                    )}>
                    <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-white' : 'text-gray-400')} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-5">

            {/* ── PROFILE ── */}
            {activeTab === 'profile' && (
              <>
                <Card className="border-0 shadow-sm rounded-2xl bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-gray-800">Profile Picture</CardTitle>
                    <CardDescription>Upload a photo to personalize your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        {avatarPreview
                          ? <img src={avatarPreview} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-gray-100" />
                          : <div className="h-20 w-20 rounded-full bg-[#2d7a2d]/10 flex items-center justify-center border-2 border-gray-100">
                              <span className="text-2xl font-bold text-[#2d7a2d]">{initials}</span>
                            </div>
                        }
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#2d7a2d] text-white flex items-center justify-center shadow-md hover:bg-[#245f24] transition disabled:opacity-60"
                        >
                          {uploadingAvatar
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Camera className="h-3.5 w-3.5" />
                          }
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{profileForm.firstName} {profileForm.lastName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{profile?.email}</p>
                        <p className="text-xs text-gray-300 mt-2">JPG, PNG or WEBP · Max 2MB</p>
                        {avatarPreview && !uploadingAvatar && (
                          <button onClick={handleRemoveAvatar} className="text-xs text-red-400 hover:text-red-600 mt-1 transition">
                            Remove photo
                          </button>
                        )}
                        {uploadingAvatar && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm rounded-2xl bg-white">
                  <CardHeader className="pb-2"><CardTitle className="text-base text-gray-800">Basic Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>First Name</Label>
                        <Input value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Last Name</Label>
                        <Input value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} /></div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={profile?.email ?? ''} disabled className="bg-gray-50 text-gray-400" />
                      <p className="text-xs text-gray-400">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2"><Label>Phone Number</Label>
                      <Input type="tel" placeholder="+63 9XX XXX XXXX" value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
                  </CardContent>
                </Card>

                {role === 'PATIENT' && (
                  <Card className="border-0 shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-gray-800">Medical Information</CardTitle>
                      <CardDescription>Used by clinic staff for your care</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Date of Birth</Label>
                          <Input type="date" value={profileForm.dateOfBirth}
                            onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Gender</Label>
                          <Select value={profileForm.gender} onValueChange={(v) => setProfileForm({ ...profileForm, gender: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                          </Select></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Blood Type</Label>
                          <Select value={profileForm.bloodType} onValueChange={(v) => setProfileForm({ ...profileForm, bloodType: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div className="space-y-2"><Label>Height (cm)</Label>
                          <Input type="number" placeholder="e.g. 170" value={profileForm.height}
                            onChange={(e) => setProfileForm({ ...profileForm, height: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Weight (kg)</Label>
                          <Input type="number" placeholder="e.g. 65" value={profileForm.weight}
                            onChange={(e) => setProfileForm({ ...profileForm, weight: e.target.value })} /></div>
                      </div>
                      <div className="space-y-2"><Label>Allergies</Label>
                        <Textarea placeholder="List any known allergies..." value={profileForm.allergies}
                          onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                          className="resize-none min-h-20" /></div>
                      <div className="pt-2 border-t border-gray-50">
                        <p className="text-sm font-medium text-gray-700 mb-3">Emergency Contact</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label>Contact Name</Label>
                            <Input placeholder="Full name" value={profileForm.emergencyContact}
                              onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })} /></div>
                          <div className="space-y-2"><Label>Contact Phone</Label>
                            <Input type="tel" placeholder="+63 9XX XXX XXXX" value={profileForm.emergencyPhone}
                              onChange={(e) => setProfileForm({ ...profileForm, emergencyPhone: e.target.value })} /></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {role === 'STAFF' && (
                  <Card className="border-0 shadow-sm rounded-2xl bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-gray-800">Professional Information</CardTitle>
                      <CardDescription>Visible to patients when booking appointments</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Specialization dropdown */}
                      <div className="space-y-2">
                        <Label>Specialization <span className="text-red-500">*</span></Label>
                        <Select
                          value={profileForm.specialization}
                          onValueChange={(v) => {
                            setProfileForm({ ...profileForm, specialization: v })
                            setSpecializationMode(v === 'Other' ? 'other' : 'select')
                            if (v !== 'Other') setOtherSpecialization('')
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIALIZATIONS.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* "Other" free-text input */}
                        {specializationMode === 'other' && (
                          <Input
                            placeholder="Please specify your specialization"
                            value={otherSpecialization}
                            onChange={(e) => setOtherSpecialization(e.target.value)}
                            className="mt-2"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>License Number</Label>
                          <Input value={profileForm.licenseNumber}
                            onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Department</Label>
                          <Input value={profileForm.department}
                            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} /></div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile || uploadingAvatar}
                    className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl px-6">
                    {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Check className="h-4 w-4 mr-2" />Save Profile</>}
                  </Button>
                </div>
              </>
            )}

            {/* ── SECURITY ── */}
            {activeTab === 'security' && (
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-800">Change Password</CardTitle>
                  <CardDescription>Use a strong password of at least 8 characters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Current Password</Label>
                    <Input type="password" value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter your current password" /></div>
                  <div className="space-y-2"><Label>New Password</Label>
                    <Input type="password" value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="At least 8 characters" /></div>
                  <div className="space-y-2"><Label>Confirm New Password</Label>
                    <Input type="password" value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repeat your new password" /></div>
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">{passwordError}</p>
                    </div>
                  )}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSavePassword} disabled={savingPassword}
                      className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl px-6">
                      {savingPassword ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</> : <><Lock className="h-4 w-4 mr-2" />Update Password</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── NOTIFICATIONS (PATIENT & STAFF only) ── */}
            {activeTab === 'notifications' && settings && isPatientOrStaff && (
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#2d7a2d]" /> Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose how you want to be reminded about your appointments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email Notifications</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Reminders sent to <span className="font-medium text-gray-500">{profile?.email}</span>
                      </p>
                    </div>
                    <Toggle checked={!!settings.emailNotifications} disabled={savingSettings}
                      onChange={(v) => handleSaveSettings({ emailNotifications: v })} />
                  </div>
                  <div className="border-t border-gray-50" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">In-App Notifications</p>
                      <p className="text-xs text-gray-400 mt-0.5">Bell icon reminders while you're using the app</p>
                    </div>
                    <Toggle checked={!!settings.appNotifications} disabled={savingSettings}
                      onChange={(v) => handleSaveSettings({ appNotifications: v })} />
                  </div>
                  <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
                    You'll be notified 24 hours and 1 hour before each scheduled appointment.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── CLINIC (ADMIN ONLY) ── */}
            {activeTab === 'clinic' && isAdmin && (
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#2d7a2d]" /> Clinic Information
                  </CardTitle>
                  <CardDescription>Basic details shown to patients</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Clinic Name</Label>
                      <Input value={clinicForm.clinicName} onChange={(e) => setClinicForm({ ...clinicForm, clinicName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label>
                      <Input type="email" value={clinicForm.clinicEmail} onChange={(e) => setClinicForm({ ...clinicForm, clinicEmail: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Phone</Label>
                      <Input value={clinicForm.clinicPhone} onChange={(e) => setClinicForm({ ...clinicForm, clinicPhone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>City</Label>
                      <Input value={clinicForm.clinicCity} onChange={(e) => setClinicForm({ ...clinicForm, clinicCity: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Address</Label>
                      <Input value={clinicForm.clinicAddress} onChange={(e) => setClinicForm({ ...clinicForm, clinicAddress: e.target.value })} /></div>
                    <div className="space-y-2"><Label>ZIP Code</Label>
                      <Input value={clinicForm.clinicZipCode} onChange={(e) => setClinicForm({ ...clinicForm, clinicZipCode: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Operating Hours</Label>
                    <Input value={clinicForm.operatingHours} onChange={(e) => setClinicForm({ ...clinicForm, operatingHours: e.target.value })}
                      placeholder="e.g. 9:00 AM - 6:00 PM, Monday to Friday" /></div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveClinic} disabled={savingClinic}
                      className="bg-[#2d7a2d] hover:bg-[#245f24] text-white rounded-xl px-6">
                      {savingClinic ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : <><Check className="h-4 w-4 mr-2" />Save Clinic Info</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── LEGAL ── */}
            {activeTab === 'legal' && (
              <Card className="border-0 shadow-sm rounded-2xl bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-gray-800 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[#2d7a2d]" /> Legal
                  </CardTitle>
                  <CardDescription>Review our policies and terms of use</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-gray-50 transition group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-[#2d7a2d]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Privacy Policy</p>
                        <p className="text-xs text-gray-400">How we collect and use your data</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition" />
                  </a>
                  <div className="border-t border-gray-50 mx-3" />
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-gray-50 transition group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#2d7a2d]/10 flex items-center justify-center flex-shrink-0">
                        <Scale className="h-4 w-4 text-[#2d7a2d]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Terms &amp; Conditions</p>
                        <p className="text-xs text-gray-400">Rules for using Kalinga-ni</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* ── DANGER ZONE ── */}
            {activeTab === 'danger' && (
              <Card className="border-0 shadow-sm rounded-2xl bg-white border border-red-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-red-600 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Delete Account
                  </CardTitle>
                  <CardDescription>
                    Permanently deactivate your account. Your medical records and appointment history
                    will be retained for clinic records but you will no longer be able to log in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isAdmin ? (
                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
                      Admin accounts cannot be self-deleted. Please contact a system administrator.
                    </div>
                  ) : (
                    <Button variant="outline"
                      onClick={() => { setDeletePassword(''); setDeleteConfirmText(''); setDeleteError(''); setShowDeleteDialog(true) }}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete My Account
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(o) => { if (!o && !deletingAccount) setShowDeleteDialog(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Type <strong>DELETE</strong> and enter your password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2"><Label>Type DELETE to confirm</Label>
              <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" /></div>
            <div className="space-y-2"><Label>Your Password</Label>
              <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter your password" /></div>
            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{deleteError}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
            <Button onClick={handleDeleteAccount} disabled={deletingAccount || deleteConfirmText !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 text-white">
              {deletingAccount ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : <><Trash2 className="h-4 w-4 mr-2" />Delete Account</>}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}