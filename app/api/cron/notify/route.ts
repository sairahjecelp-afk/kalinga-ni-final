import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { send24hReminder, send1hReminder } from "@/lib/notifications";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const secret = req.headers.get("x-cron-secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { emailSent: 0, appSent: 0, skipped: 0, errors: 0 };

  try {
    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24hEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const window1hStart  = new Date(now.getTime() + 45 * 60 * 1000);
    const window1hEnd    = new Date(now.getTime() + 75 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: "SCHEDULED",
        OR: [
          { appointmentDate: { gte: window24hStart, lte: window24hEnd } },
          { appointmentDate: { gte: window1hStart,  lte: window1hEnd  } },
        ],
      },
      include: {
        patient: {
          include: {
            user: {
              include: { settings: true },
            },
          },
        },
        staff: {
          include: { user: true },
        },
      },
    });

    for (const appt of appointments) {
      const patientUser = appt.patient.user;
      const settings    = patientUser.settings;

      const diffMs    = appt.appointmentDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const reminderType: "24H" | "1H" =
        diffHours >= 23 && diffHours <= 25 ? "24H" : "1H";

      const patientName = `${patientUser.firstName} ${patientUser.lastName}`;
      const staffName   = `Dr. ${appt.staff.user.firstName} ${appt.staff.user.lastName}`;

      // ── Email notification ─────────────────────────────────────────────────
      if (settings?.emailNotifications) {
        const alreadySentEmail = await prisma.notificationLog.findFirst({
          where: {
            userId:  patientUser.id,
            channel: "EMAIL",
            subject: `${reminderType}:${appt.id}`,
            status:  "SENT",
          },
        });

        if (!alreadySentEmail) {
          try {
            if (reminderType === "24H") {
              await send24hReminder({
                toEmail:         patientUser.email,
                patientName,
                staffName,
                appointmentDate: appt.appointmentDate,
                reason:          appt.reason,
              });
            } else {
              await send1hReminder({
                toEmail:         patientUser.email,
                patientName,
                staffName,
                appointmentDate: appt.appointmentDate,
                reason:          appt.reason,
              });
            }

            await prisma.notificationLog.create({
              data: {
                userId:  patientUser.id,
                channel: "EMAIL",
                subject: `${reminderType}:${appt.id}`,
                body:    `${reminderType} email reminder sent for appointment on ${appt.appointmentDate.toISOString()}`,
                status:  "SENT",
                sentAt:  new Date(),
              },
            });

            results.emailSent++;
          } catch (err) {
            console.error(`Failed to send ${reminderType} email for appt ${appt.id}:`, err);

            await prisma.notificationLog.create({
              data: {
                userId:  patientUser.id,
                channel: "EMAIL",
                subject: `${reminderType}:${appt.id}`,
                body:    `Failed to send ${reminderType} email: ${(err as Error).message}`,
                status:  "FAILED",
              },
            });

            results.errors++;
          }
        } else {
          results.skipped++;
        }
      }

      // ── In-app notification ────────────────────────────────────────────────
      if (settings?.appNotifications) {
        const alreadySentApp = await prisma.notificationLog.findFirst({
          where: {
            userId:  patientUser.id,
            channel: "APP",
            subject: `${reminderType}:${appt.id}`,
            status:  { not: "FAILED" },
          },
        });

        if (!alreadySentApp) {
          const apptDateStr = appt.appointmentDate.toLocaleDateString("en-PH", {
            weekday: "long",
            month:   "long",
            day:     "numeric",
          });
          const apptTimeStr = appt.appointmentDate.toLocaleTimeString("en-PH", {
            hour:   "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          const body =
            reminderType === "24H"
              ? `Your appointment with ${staffName} is tomorrow, ${apptDateStr} at ${apptTimeStr}.`
              : `Your appointment with ${staffName} is in about 1 hour, at ${apptTimeStr}.`;

          try {
            await prisma.notificationLog.create({
              data: {
                userId:  patientUser.id,
                channel: "APP",
                subject: `${reminderType}:${appt.id}`,
                body,
                status:  "SENT",
                sentAt:  new Date(),
              },
            });

            results.appSent++;
          } catch (err) {
            console.error(`Failed to create APP notif for appt ${appt.id}:`, err);
            results.errors++;
          }
        } else {
          results.skipped++;
        }
      }

      // If both preferences are off, count as skipped
      if (!settings?.emailNotifications && !settings?.appNotifications) {
        results.skipped++;
      }
    }

    return NextResponse.json({
      ok:        true,
      timestamp: now.toISOString(),
      ...results,
    });
  } catch (err) {
    console.error("Cron job fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: (err as Error).message },
      { status: 500 }
    );
  }
}