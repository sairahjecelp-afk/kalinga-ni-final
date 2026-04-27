import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/notifications/read-all — mark all unread APP notifications as read
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.notificationLog.updateMany({
    where: {
      userId:  session.user.id,
      channel: "APP",
      status:  { not: "READ" },
    },
    data: { status: "READ" },
  });

  return NextResponse.json({ ok: true });
}