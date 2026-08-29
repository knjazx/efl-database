import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function isAuthorized() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");
  return sessionToken?.value === "authenticated_efl_admin";
}

export async function GET() {
  if (!isAuthorized()) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        teamName: log.teamName,
        description: log.description,
        timestamp: log.timestamp,
      })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch activity logs" }, { status: 500 });
  }
}
