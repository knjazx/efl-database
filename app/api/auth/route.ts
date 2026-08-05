import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "eflknjazx";

export async function GET() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("efl_admin_session");

  if (sessionToken && sessionToken.value === "authenticated_efl_admin") {
    return NextResponse.json({ authenticated: true });
  }
  return NextResponse.json({ authenticated: false });
}

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (password === ADMIN_PASSWORD) {
      const cookieStore = cookies();
      cookieStore.set("efl_admin_session", "authenticated_efl_admin", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid admin password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = cookies();
  cookieStore.delete("efl_admin_session");
  return NextResponse.json({ success: true });
}
