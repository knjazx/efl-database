export async function saveUploadedFile(file: File, folder: string = "uploads"): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const mimeType = file.type || "image/png";
  const base64Data = buffer.toString("base64");

  // Returns Base64 Data URL for zero-filesystem serverless storage (Vercel & Supabase compatible)
  return `data:${mimeType};base64,${base64Data}`;
}
