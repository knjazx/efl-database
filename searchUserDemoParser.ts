import fs from "fs";
import path from "path";

function searchTranscripts() {
  const brainDir = "C:/Users/knjazx/.gemini/antigravity/brain";
  if (!fs.existsSync(brainDir)) return;

  const convs = fs.readdirSync(brainDir);
  for (const c of convs) {
    const logFile = path.join(brainDir, c, ".system_generated", "logs", "transcript_full.jsonl");
    if (fs.existsSync(logFile)) {
      const text = fs.readFileSync(logFile, "utf-8");
      if (text.toLowerCase().includes("cybershoke") || text.toLowerCase().includes("демо") || text.toLowerCase().includes("парсер")) {
        console.log(`Found keywords in conversation: ${c}`);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.toLowerCase().includes("cybershoke") || line.toLowerCase().includes("dem") || line.toLowerCase().includes("парсер")) {
            if (line.length < 500) {
              console.log(line);
            } else {
              console.log(line.substring(0, 300) + "... [TRUNCATED]");
            }
          }
        }
      }
    }
  }
}

searchTranscripts();
