import { prisma } from "./lib/prisma";

async function cleanSwissTestData() {
  console.log("=== CLEANING UP SWISS TEST DATA ===");

  // 1. Find all test tournaments created during automated testing
  const testTournaments = await prisma.tournament.findMany({
    where: {
      OR: [
        { name: { contains: "SWISS TEST CUP" } },
        { name: { contains: "Тестовый Турнир EFL Swiss" } },
        { slug: { contains: "swiss-test-cup" } },
        { slug: { contains: "testovyy-turnir-efl-swiss" } },
      ],
    },
  });

  console.log(`Found ${testTournaments.length} test tournaments to delete.`);

  for (const t of testTournaments) {
    await prisma.tournament.delete({
      where: { id: t.id },
    });
    console.log(`[DELETED] Tournament '${t.name}' (${t.id})`);
  }

  // 2. Find all test teams with name or slug matching "Swiss Team" / "swiss_team_"
  const testTeams = await prisma.team.findMany({
    where: {
      OR: [
        { name: { contains: "Swiss Team" } },
        { slug: { contains: "swiss_team_" } },
      ],
    },
  });

  console.log(`Found ${testTeams.length} test teams to delete.`);

  for (const team of testTeams) {
    await prisma.team.delete({
      where: { id: team.id },
    });
    console.log(`[DELETED] Team '${team.name}' (${team.id})`);
  }

  // 3. Clean up test activity logs
  const deletedLogs = await prisma.activityLog.deleteMany({
    where: {
      OR: [
        { description: { contains: "Swiss Team" } },
        { description: { contains: "SWISS TEST CUP" } },
        { description: { contains: "Тестовый Турнир EFL Swiss" } },
      ],
    },
  });
  console.log(`[DELETED] ${deletedLogs.count} test activity logs.`);

  console.log(">>> CLEANUP COMPLETE 100% CLEANLY! <<<");
}

cleanSwissTestData()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
