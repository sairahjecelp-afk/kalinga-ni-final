# Kalinga-ni — Project Context

## What is this?
Kalinga-ni is a clinic appointment management system for the Marinduque Provincial Hospital Outpatient Department (OPD). It is a freelance project that is finished and deployed on Vercel.

## Tech Stack
- **Framework:** Next.js (App Router) with Turbopack
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma ORM (v5.22.0)
- **Auth:** NextAuth.js (JWT strategy, credentials provider)
- **Email:** Resend
- **UI:** Tailwind CSS, shadcn/ui components, Lucide icons
- **Deployment:** Vercel

## Project Structure
```
app/
  api/
    admin/patients/         → Admin patient management
    announcements/          → Announcements CRUD
    appointments/           → Appointment booking (POST) and listing (GET)
    appointments/[id]/      → Update appointment status (PATCH)
    auth/register/          → User registration
    auth/[...nextauth]/     → NextAuth handler
    cron/notify/            → Cron job for appointment reminders
    medical-records/        → Medical records
    notifications/          → In-app notifications (GET, PATCH)
    notifications/read-all/ → Mark all notifications read
    notifications/[id]/     → Mark single notification read
    schedule/               → Staff schedule slots (GET, POST)
    schedule/me/            → Get current staff's ID
    schedule/slots/         → Available booking slots
    schedule/[id]/          → Update/delete schedule slot (PATCH, DELETE)
    schedule/requests/      → Schedule requests (GET, POST)
    schedule/requests/[id]/ → Approve/reject/cancel a schedule request (PATCH)
    settings/               → Clinic settings
    user/                   → User profile, avatar, password, settings
  dashboard/
    layout.tsx              → Dashboard shell (auth check + sidebar)
    page.tsx                → Dashboard home
    announcements/
    appointments/           → Appointment list (tabs: upcoming/completed/cancelled)
    appointments/book/      → Booking flow
    medical-records/
    patients/
    schedule/               → Schedule management (role-aware: staff submits requests, admin approves)
    settings/
    users/
  contact/
  login/
  privacy/
  register/
  terms/
components/
  dashboard/
    notifications-bell.tsx  → Bell icon with polling (30s), in-app notifications (PATIENT, STAFF, ADMIN)
    sidebar.tsx             → Role-based sidebar nav
  appointments/
    appointment-actions.tsx
    add-medical-record.tsx
  providers.tsx
  theme-provider.tsx
  ui/                       → shadcn/ui components
lib/
  auth.ts                   → NextAuth config
  db.ts                     → Prisma client
  notifications.ts          → Email templates + Resend send functions
  utils.ts
prisma/
  schema.prisma
```

## Database Schema (Prisma)
Models: `User`, `UserSettings`, `Patient`, `Staff`, `StaffSchedule`, `ScheduleRequest`, `Appointment`, `MedicalRecord`, `Announcement`, `AppointmentSettings`, `ClinicSettings`, `NotificationLog`, `AuditLog`

### Key model notes
- `User.status` values: `PENDING` (unverified), `ACTIVE`, `SUSPENDED`, `BANNED`, `DELETED`
- `User.role` values: `PATIENT`, `STAFF`, `ADMIN`
- `Patient` includes optional `height` (cm) and `weight` (kg) fields updated via standard profile settings.
- `StaffSchedule.date` → stored as UTC midnight of the PHT calendar date
- `StaffSchedule.startTime` / `endTime` → stored as plain `"HH:mm"` strings in **Philippine Time (PHT)**
- `ScheduleRequest.date` → stored as UTC midnight of the PHT calendar date (same as StaffSchedule)
- `ScheduleRequest.startTime` / `endTime` → stored as plain `"HH:mm"` strings in **Philippine Time (PHT)**
- `ScheduleRequest.status` values: `PENDING`, `APPROVED`, `REJECTED`
- `Appointment.appointmentDate` → stored in UTC
- `NotificationLog.channel` values: `APP`, `EMAIL`, `SMS`
- `NotificationLog.status` values: `PENDING`, `SENT`, `FAILED`, `READ`

## Critical: Timezone Handling
**This project uses Philippine Time (PHT = UTC+8) throughout.**

The most common bug source is timezone mismatch. Rules:
- All dates stored in DB are UTC
- `StaffSchedule.startTime`/`endTime` and `ScheduleRequest.startTime`/`endTime` are PHT strings ("HH:mm") — when querying appointments by time window, always subtract 8 hours (PHT offset) to convert to UTC before querying
- All date display must pass `timeZone: 'Asia/Manila'` to `toLocaleDateString` / `toLocaleTimeString`
- When building UTC query windows from PHT time strings use:
  ```ts
  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000
  const slotStart = new Date(slotDateMs + (startHour * 60 + startMin) * 60_000 - PHT_OFFSET_MS)
  ```
- When parsing date strings from frontend, always use `Date.UTC()` to avoid local timezone shift

## Authentication
- JWT strategy, credentials provider
- `lib/auth.ts` session callback always does a DB lookup to verify user still exists and is `ACTIVE` — stale sessions (e.g. after DB reset) are auto-invalidated and redirected to `/login`
- Upon successful registration, users are automatically logged in and redirected to the dashboard.
- Suspended/banned users are kicked out immediately on the next request.
- **Client-side logout:** In NextAuth v5, always use `signOut({ callbackUrl: '/' })`, NEVER use `redirectUrl` as it fails silently and leaves "ghost sessions".

## Registration Flow
1. User fills out the registration form.
2. Account is created with `status: ACTIVE` via `POST /api/auth/register`.
3. The register page automatically calls `signIn` with their credentials.
4. User is redirected directly to `/dashboard`.

## Notifications System
### In-app (bell)
- Stored in `NotificationLog` with `channel: 'APP'`
- `notifications-bell.tsx` polls `GET /api/notifications` every 30 seconds
- Returns unread APP notifications (`status != 'READ'`)
- Bell icon shows unread count badge
- Shown for PATIENT, STAFF, and ADMIN roles
- Notifications with `subject: 'Appointment Cancelled'` show red `CalendarX` icon
- Notifications with `subject: 'Appointment Confirmed'` show default bell icon
- Mark read via `PATCH /api/notifications/[id]` or mark all via `PATCH /api/notifications/read-all`

### Email
- All emails sent via Resend
- `lib/notifications.ts` contains all templates and send functions
- In dev: `RESEND_DEV_TO_EMAIL` env var overrides recipient (all emails go to this address)
- In production: emails go to actual recipient

### Notification triggers
| Event | In-app | Email |
|---|---|---|
| Appointment booked (patient) | ✅ | ✅ |
| Staff removes availability slot | ✅ per affected patient | ✅ per affected patient |
| 24h before appointment | ❌ | ✅ (cron) |
| 1h before appointment | ❌ | ✅ (cron) |
| Staff submits schedule request | ✅ all admins (in-app only) | ❌ |
| Admin approves schedule request | ✅ staff | ✅ staff |
| Admin rejects schedule request | ✅ staff | ✅ staff |

## Staff Schedule Logic
- Staff submit availability requests via the schedule page (date, start time, end time, slot duration)
- Admin reviews requests in the "Availability Requests" tab and approves or rejects them
- On approval → a `StaffSchedule` row is created and patients can book that slot
- On rejection → staff is notified in-app and by email with no reason given
- Staff can cancel their own PENDING requests before admin acts on them
- Once a `StaffSchedule` slot is created (approved), it cannot be edited — only deleted
- Deleting a slot with booked appointments: auto-cancels all `SCHEDULED` appointments in that window, notifies patients (in-app + email), then deletes the slot
- **Bug that was fixed:** DELETE route was treating PHT time strings as UTC when querying appointments — fixed by applying PHT→UTC offset

## Schedule Request Flow
1. Staff goes to `/dashboard/schedule` → "My Requests" tab → clicks "Request Availability"
2. Staff fills in date, start time, end time, slot duration → submits
3. All admins receive an in-app notification
4. Admin goes to `/dashboard/schedule` → "Availability Requests" tab → sees pending requests with Approve/Reject buttons
5. **Approve** → `StaffSchedule` created, request marked `APPROVED`, staff notified in-app + email
6. **Reject** → request marked `REJECTED`, staff notified in-app + email
7. Staff can cancel a `PENDING` request at any time before admin acts

## Schedule Page (role-aware)
`app/dashboard/schedule/page.tsx` renders differently based on role:

### Staff view
- **"Approved Schedule" tab** — weekly calendar of their own approved slots, with booking fill rates
- **"My Requests" tab** — list of all their submitted requests with status badges (Pending / Approved / Rejected), cancel button on pending ones, and a "Request Availability" button

### Admin view
- **"Approved Schedules" tab** — weekly calendar of all staff's approved slots, admin can remove any slot
- **"Availability Requests" tab** — list of all staff requests, filterable by status and staff member, with Approve/Reject buttons on pending ones. Badge on tab shows pending count.

## Appointment Cancellation Display
- `notes` field contains cancellation reason prefixed with `"Cancelled: Staff removed their availability for this time slot"`
- Patient dashboard detects this prefix and shows a red banner: "Appointment cancelled by clinic"
- Staff dashboard shows an amber banner: "You removed your availability for this time slot"
- Raw notes string is hidden in both cases when this prefix is detected

## Loading State
- `app/dashboard/loading.tsx` exists — Next.js App Router automatically shows it as a skeleton while any dashboard page loads
- No manual Suspense or loading flags needed in individual pages

## Environment Variables needed
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_DEV_TO_EMAIL   # dev only — overrides email recipient
```

## Known Patterns / Decisions
- No `localStorage` or `sessionStorage` used anywhere
- Server components used for data fetching in dashboard pages; client components for interactivity
- All API routes follow Next.js App Router conventions (`route.ts` / `route.tsx`)
- Prisma client imported from `@/lib/db`
- Auth imported from `@/lib/auth`
- Toast notifications use `sonner`
- Primary brand color: `#2d7a2d` (green)
- `app/dashboard/loading.tsx` provides skeleton loading for all dashboard pages