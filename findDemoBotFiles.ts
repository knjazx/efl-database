import fs from "fs";
import path from "path";

function findFiles(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (f === "node_modules" || f === ".git" || f === ".next") continue;
    const fullPath = path.join(dir, f);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findFiles(fullPath, fileList);
      } else {
        if (
          f.endsWith(".py") ||
          f.endsWith(".pyw") ||
          f.endsWith(".exe") ||
          f.toLowerCase().includes("bot") ||
          f.toLowerCase().includes("demo")
        ) {
          fileList.push(fullPath);
        }
      }
    } catch (e) {}
  }
  return fileList;
}

console.log("Searching for demo bot files...");
const scratchDir = "C:/Users/knjazx/.gemini/antigravity/scratch";
const results = findFiles(scratchDir);

results.forEach((r) => console.log(r));
