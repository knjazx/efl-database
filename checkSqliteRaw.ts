import fs from "fs";
import path from "path";

// Inspect dev.db file directly
const dbPath = path.join(process.cwd(), "prisma", "dev.db");

if (fs.existsSync(dbPath)) {
  const stat = fs.statSync(dbPath);
  console.log("dev.db exists, size:", stat.size, "bytes");

  // Read string contents of dev.db to search for team names or tags
  const buf = fs.readFileSync(dbPath);
  const str = buf.toString("utf8");
  
  // Extract all ascii/utf8 text words that look like team names
  const matches = str.match(/[A-[#A-Za-z0-9_А-Яа-яЁё\s]{3,30}/g) || [];
  console.log("Found text fragments in dev.db:", matches.length);
} else {
  console.log("dev.db does NOT exist");
}
