import fs from "fs";
import path from "path";

export async function saveUploadedFile(file: File, folder: string = "uploads"): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create clean unique filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${timestamp}_${safeName}`;
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFileSync(filePath, buffer);

  return `/${folder}/${fileName}`;
}
