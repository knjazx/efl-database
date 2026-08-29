import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueName = Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filepath = path.join(process.cwd(), "public", "uploads", uniqueName);

    await writeFile(filepath, buffer);

    return NextResponse.json({ success: true, url: "/uploads/" + uniqueName });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
