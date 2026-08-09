import { prisma } from "./lib/prisma";

async function main() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
  });

  console.log("-----------------------------------------");
  console.log("TOTAL ACTIVITY LOGS:", logs.length);
  for (const l of logs) {
    console.log(`[${l.timestamp.toISOString()}] ${l.teamName || "SYSTEM"}: ${l.description}`);
  }
  console.log("-----------------------------------------");
}

main().finally(() => prisma.$disconnect());
