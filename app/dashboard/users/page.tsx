'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users, ShieldBan, ShieldOff, Trash2, KeyRound,
  ShieldCheck, Search,
} from 'lucide-react'
import { SPECIALIZATIONS } from '@/lib/specializations'

type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED'

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  status: UserStatus
  createdAt: string
  staff?: {
    specialization: string
  } | null
}

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE:    'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  BANNED:    'bg-red-100 text-red-700',
  DELETED:   'bg-gray-100 text-gray-400 line-through',
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN:   'bg-red-100 text-red-800',
  STAFF:   'bg-blue-100 text-blue-800',
  PATIENT: 'bg-green-100 text-green-800',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterSpecialization, setFilterSpecialization] = useState('ALL')

  const [modal, setModal] = useState<{
    type: 'suspend' | 'ban' | 'delete' | 'activate' | 'reset' | null
    user: User | null
  }>({ type: null, user: null })
  const [newPassword, setNewPassword] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  async function performAction() {
    if (!modal.user || !modal.type) return
    setActionLoading(true)
    try {
      const actionMap = {
        suspend: 'SUSPEND', ban: 'BAN', delete: 'DELETE',
        activate: 'ACTIVATE', reset: 'RESET_PASSWORD',
      }
      const res = await fetch(`/api/admin/users/${modal.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionMap[modal.type],
          ...(modal.type === 'reset' && { newPassword }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(data.message, true)
      setModal({ type: null, user: null })
      setNewPassword('')
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Something went wrong', false)
    } finally {
      setActionLoading(false)
    }
  }

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // Show specialization filter only when viewing STAFF
  const showSpecFilter = filterRole === 'STAFF' || filterRole === 'ALL'

  const filtered = users.filter(u => {
    const matchSearch = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    const matchRole   = filterRole === 'ALL' || u.role === filterRole
    const matchStatus = filterStatus === 'ALL' || u.status === filterStatus
    const matchSpec   =
      filterSpecialization === 'ALL' ||
      u.role !== 'STAFF' ||
      u.staff?.specialization === filterSpecialization
    return matchSearch && matchRole && matchStatus && matchSpec
  })

  const openModal = (type: typeof modal.type, user: User) => setModal({ type, user })

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.ok ? 'bg-[#2d7a2d]' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">User Management</h1>
        <p className="text-gray-500 text-sm">Manage all user accounts in the system</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d7a2d]/30"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => {
            setFilterRole(e.target.value)
            setFilterSpecialization('ALL')
          }}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d7a2d]/30"
        >
          <option value="ALL">All Roles</option>
          <option value="PATIENT">Patient</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d7a2d]/30"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="BANNED">Banned</option>
          <option value="DELETED">Deleted</option>
        </select>

        {/* Specialization filter — visible when role is ALL or STAFF */}
        {showSpecFilter && (
          <select
            value={filterSpecialization}
            onChange={e => setFilterSpecialization(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d7a2d]/30"
          >
            <option value="ALL">All Specializations</option>
            {SPECIALIZATIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardContent className="pt-6 text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Specialization</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Joined</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition ${user.status === 'DELETED' ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4 font-medium text-gray-800">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-5 py-4 text-gray-500">{user.email}</td>
                    <td className="px-5 py-4 text-gray-500">{user.phone || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_STYLES[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {user.role === 'STAFF'
                        ? user.staff?.specialization
                          ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                              {user.staff.specialization}
                            </span>
                          : <span className="text-gray-300 italic text-xs">Not set</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[user.status] ?? ''}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      {user.role !== 'ADMIN' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {user.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => openModal('suspend', user)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition"
                              >
                                <ShieldOff className="h-3.5 w-3.5" />
                                Suspend
                              </button>
                              <button
                                onClick={() => openModal('ban', user)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                              >
                                <ShieldBan className="h-3.5 w-3.5" />
                                Ban
                              </button>
                            </>
                          )}
                          {(user.status === 'SUSPENDED' || user.status === 'BANNED') && (
                            <button
                              onClick={() => openModal('activate', user)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Reactivate
                            </button>
                          )}
                          {user.status !== 'DELETED' && (
                            <button
                              onClick={() => openModal('delete', user)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {modal.type && modal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            {modal.type === 'suspend' && (
              <>
                <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldOff className="h-6 w-6 text-yellow-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 text-center mb-1">Suspend User</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  <strong>{modal.user.firstName} {modal.user.lastName}</strong> will not be able to log in until reactivated.
                </p>
              </>
            )}
            {modal.type === 'ban' && (
              <>
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldBan className="h-6 w-6 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 text-center mb-1">Ban User</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  <strong>{modal.user.firstName} {modal.user.lastName}</strong> will be permanently banned from logging in.
                </p>
              </>
            )}
            {modal.type === 'activate' && (
              <>
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-[#2d7a2d]" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 text-center mb-1">Reactivate User</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  <strong>{modal.user.firstName} {modal.user.lastName}</strong> will be able to log in again.
                </p>
              </>
            )}
            {modal.type === 'delete' && (
              <>
                <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-gray-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 text-center mb-1">Delete User</h2>
                <p className="text-sm text-gray-500 text-center mb-6">
                  <strong>{modal.user.firstName} {modal.user.lastName}</strong>'s account will be deactivated. Their data is preserved.
                </p>
              </>
            )}
            {modal.type === 'reset' && (
              <>
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="h-6 w-6 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 text-center mb-1">Reset Password</h2>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Set a new password for <strong>{modal.user.firstName} {modal.user.lastName}</strong>.
                </p>
                <input
                  type="password"
                  placeholder="New password (min. 6 characters)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-gray-200"
                onClick={() => { setModal({ type: null, user: null }); setNewPassword('') }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 rounded-xl text-white ${
                  modal.type === 'ban'      ? 'bg-red-500 hover:bg-red-600' :
                  modal.type === 'suspend'  ? 'bg-yellow-500 hover:bg-yellow-600' :
                  modal.type === 'delete'   ? 'bg-gray-500 hover:bg-gray-600' :
                  modal.type === 'activate' ? 'bg-[#2d7a2d] hover:bg-[#245f24]' :
                  'bg-blue-500 hover:bg-blue-600'
                }`}
                onClick={performAction}
                disabled={actionLoading || (modal.type === 'reset' && newPassword.length < 6)}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}