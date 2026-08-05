import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
