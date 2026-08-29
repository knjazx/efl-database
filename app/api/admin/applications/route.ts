import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const applications = await prisma.teamApplication.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ success: true, applications });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch applications" }, { status: 500 });
  }
}
