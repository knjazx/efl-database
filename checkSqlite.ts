import { PrismaClient } from "@prisma/client";

// Connect specifically to local SQLite dev.db
const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./prisma/dev.db",
    },
  },
});

async function checkSqlite() {
  try {
    const teams = await sqlitePrisma.team.findMany({
      include: { memberships: true },
    });
    console.log("SQLITE DEV.DB TEAMS COUNT:", teams.length);
    for (const t of teams) {
      console.log(`- ${t.name} (${t.tag})`);
    }
  } catch (err: any) {
    console.error("SQLite check error:", err.message);
  } finally {
    await sqlitePrisma.$disconnect();
  }
}

checkSqlite();
