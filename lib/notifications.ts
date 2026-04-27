import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const CLINIC_NAME = "Kalinga-ni Clinic";
const DEV_TO_EMAIL = process.env.RESEND_DEV_TO_EMAIL;

function resolveRecipient(email: string) {
  return process.env.NODE_ENV !== "production" && DEV_TO_EMAIL
    ? DEV_TO_EMAIL
    : email;
}

// Always pass timeZone: 'Asia/Manila' so server-side (UTC) renders Philippine time
function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Format a plain "HH:mm" PHT string to 12-hour display
function formatTimeStr(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Email Templates ───────────────────────────────────────────────────────────

function buildVerificationEmail(patientName: string, verificationUrl: string) {
  return {
    subject: `Verify your Kalinga-ni account`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #2d7a2d; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Welcome to Kalinga-ni! Please verify your email address to activate your account and start booking appointments.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}"
              style="display: inline-block; background: #2d7a2d; color: white; font-size: 15px; font-weight: 600;
                     padding: 14px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.01em;">
              Verify My Account
            </a>
          </div>

          <p style="font-size: 13px; color: #6b7280; text-align: center;">
            This link expires in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            If the button above doesn't work, copy and paste this link into your browser:<br />
            <a href="${verificationUrl}" style="color: #2d7a2d; word-break: break-all;">${verificationUrl}</a>
          </p>

          <p style="font-size: 14px; color: #374151; margin-bottom: 0; margin-top: 24px;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

function build24hEmail(patientName: string, staffName: string, appointmentDate: Date, reason: string) {
  const date = formatDate(appointmentDate);
  const time = formatTime(appointmentDate);

  return {
    subject: `Reminder: Your appointment is tomorrow — ${date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0f766e; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            This is a friendly reminder that you have an appointment <strong>tomorrow</strong>.
          </p>

          <div style="background: white; border: 1px solid #d1fae5; border-left: 4px solid #0f766e; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Appointment Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 100px;">Date</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Doctor</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${staffName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Reason</td>
                <td style="padding: 6px 0; font-size: 14px;">${reason}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Please arrive on time. If you need to cancel or reschedule, please do so as soon as possible through the patient portal.
          </p>
          <p style="font-size: 14px; color: #374151;">See you tomorrow!</p>
          <p style="font-size: 14px; color: #374151; margin-bottom: 0;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

function build1hEmail(patientName: string, staffName: string, appointmentDate: Date, reason: string) {
  const date = formatDate(appointmentDate);
  const time = formatTime(appointmentDate);

  return {
    subject: `Your appointment is in 1 hour — ${time}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0f766e; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Your appointment is coming up in <strong>about 1 hour</strong>. Please make your way to the clinic soon.
          </p>

          <div style="background: white; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Appointment Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 100px;">Date</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Doctor</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${staffName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Reason</td>
                <td style="padding: 6px 0; font-size: 14px;">${reason}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            We look forward to seeing you shortly!
          </p>
          <p style="font-size: 14px; color: #374151; margin-bottom: 0;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

function buildSlotCancelledEmail(
  patientName: string,
  staffName: string,
  appointmentDate: Date,
  reason: string
) {
  const date = formatDate(appointmentDate);
  const time = formatTime(appointmentDate);

  return {
    subject: `Your appointment on ${date} has been cancelled`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #b91c1c; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            We're sorry to inform you that your upcoming appointment has been
            <strong style="color: #b91c1c;">cancelled</strong> because the staff member has
            removed their availability for that time slot.
          </p>

          <div style="background: white; border: 1px solid #fecaca; border-left: 4px solid #b91c1c; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Cancelled Appointment</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 100px;">Date</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Doctor</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${staffName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Original reason</td>
                <td style="padding: 6px 0; font-size: 14px;">${reason}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #374151;">
            Please log in to the patient portal to book a new appointment at another available time.
            We apologise for any inconvenience this may have caused.
          </p>
          <p style="font-size: 14px; color: #374151; margin-bottom: 0;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

function buildAppointmentConfirmationEmail(
  patientName: string,
  staffName: string,
  appointmentDate: Date,
  duration: number,
  reason: string
) {
  const date = formatDate(appointmentDate);
  const time = formatTime(appointmentDate);

  return {
    subject: `Appointment Confirmed — ${date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #2d7a2d; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Your appointment has been <strong style="color: #2d7a2d;">successfully booked</strong>. Here are your appointment details:
          </p>

          <div style="background: white; border: 1px solid #d1fae5; border-left: 4px solid #2d7a2d; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Appointment Details</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 100px;">Date</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${date}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Duration</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Doctor</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${staffName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Reason</td>
                <td style="padding: 6px 0; font-size: 14px;">${reason}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Please arrive on time. If you need to cancel or reschedule, you can do so through the patient portal before your appointment.
          </p>
          <p style="font-size: 14px; color: #374151; margin-bottom: 0;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

// NEW: Schedule request approved email (sent to staff)
function buildScheduleRequestApprovedEmail(
  staffName: string,
  date: Date,
  startTime: string,
  endTime: string
) {
  const dateLabel = date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: `Your availability request for ${dateLabel} has been approved`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #2d7a2d; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${staffName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Great news! Your availability request has been <strong style="color: #2d7a2d;">approved</strong>.
            Patients can now book appointments during this time window.
          </p>

          <div style="background: white; border: 1px solid #d1fae5; border-left: 4px solid #2d7a2d; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Approved Schedule</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 120px;">Date</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${dateLabel}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time window</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${formatTimeStr(startTime)} – ${formatTimeStr(endTime)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            You can view your schedule in the staff portal.
          </p>
          <p style="font-size: 14px; color: #374151; margin-bottom: 0;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

// NEW: Schedule request rejected email (sent to staff)
function buildScheduleRequestRejectedEmail(
  staffName: string,
  date: Date,
  startTime: string,
  endTime: string
) {
  const dateLabel = date.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    subject: `Your availability request for ${dateLabel} was not approved`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #b91c1c; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${CLINIC_NAME}</h1>
        </div>
        <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${staffName}</strong>,</p>
          <p style="font-size: 15px; color: #374151;">
            Unfortunately, your availability request has <strong style="color: #b91c1c;">not been approved</strong>.
            Please contact the clinic admin for more information or to submit a new request.
          </p>

          <div style="background: white; border: 1px solid #fecaca; border-left: 4px solid #b91c1c; border-radius: 6px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;">Rejected Request</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 120px;">Date</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${dateLabel}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Time window</td>
                <td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${formatTimeStr(startTime)} – ${formatTimeStr(endTime)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #374151; margin-bottom: 0;">— The ${CLINIC_NAME} Team</p>
        </div>
      </div>
    `,
  };
}

// ── Send Functions ────────────────────────────────────────────────────────────

export async function sendVerificationEmail({
  toEmail,
  name,
  verificationUrl,
}: {
  toEmail: string;
  name: string;
  verificationUrl: string;
}) {
  const { subject, html } = buildVerificationEmail(name, verificationUrl);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (verification): ${error.message}`);
  return data;
}

export async function sendAppointmentConfirmationEmail({
  toEmail,
  patientName,
  staffName,
  appointmentDate,
  duration,
  reason,
}: {
  toEmail: string;
  patientName: string;
  staffName: string;
  appointmentDate: Date;
  duration: number;
  reason: string;
}) {
  const { subject, html } = buildAppointmentConfirmationEmail(
    patientName,
    staffName,
    appointmentDate,
    duration,
    reason
  );
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (confirmation): ${error.message}`);
  return data;
}

export async function send24hReminder({
  toEmail,
  patientName,
  staffName,
  appointmentDate,
  reason,
}: {
  toEmail: string;
  patientName: string;
  staffName: string;
  appointmentDate: Date;
  reason: string;
}) {
  const { subject, html } = build24hEmail(patientName, staffName, appointmentDate, reason);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (24h): ${error.message}`);
  return data;
}

export async function send1hReminder({
  toEmail,
  patientName,
  staffName,
  appointmentDate,
  reason,
}: {
  toEmail: string;
  patientName: string;
  staffName: string;
  appointmentDate: Date;
  reason: string;
}) {
  const { subject, html } = build1hEmail(patientName, staffName, appointmentDate, reason);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (1h): ${error.message}`);
  return data;
}

export async function sendSlotCancelledEmail({
  toEmail,
  patientName,
  staffName,
  appointmentDate,
  reason,
}: {
  toEmail: string;
  patientName: string;
  staffName: string;
  appointmentDate: Date;
  reason: string;
}) {
  const { subject, html } = buildSlotCancelledEmail(
    patientName,
    staffName,
    appointmentDate,
    reason
  );
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (slot cancelled): ${error.message}`);
  return data;
}

// NEW: Send schedule request approved email to staff
export async function sendScheduleRequestApprovedEmail({
  toEmail,
  staffName,
  date,
  startTime,
  endTime,
}: {
  toEmail: string;
  staffName: string;
  date: Date;
  startTime: string;
  endTime: string;
}) {
  const { subject, html } = buildScheduleRequestApprovedEmail(staffName, date, startTime, endTime);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (request approved): ${error.message}`);
  return data;
}

// NEW: Send schedule request rejected email to staff
export async function sendScheduleRequestRejectedEmail({
  toEmail,
  staffName,
  date,
  startTime,
  endTime,
}: {
  toEmail: string;
  staffName: string;
  date: Date;
  startTime: string;
  endTime: string;
}) {
  const { subject, html } = buildScheduleRequestRejectedEmail(staffName, date, startTime, endTime);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: resolveRecipient(toEmail),
    subject,
    html,
  });

  if (error) throw new Error(`Resend error (request rejected): ${error.message}`);
  return data;
}