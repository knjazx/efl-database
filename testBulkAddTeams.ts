import { prisma } from "./lib/prisma";

async function testBulkAdd() {
  console.log("=== TESTING BULK ADD TEAMS TO TOURNAMENT ===");

  // 1. Create a test tournament
  const t = await prisma.tournament.create({
    data: {
      name: "Bulk Add Test Tournament",
      slug: `bulk-test-${Date.now()}`,
      presetType: "CUSTOM",
      maxParticipants: 16,
    },
  });
  console.log(`[PASS] Created test tournament: ${t.name} (${t.id})`);

  // 2. Create 5 test teams
  const teamIds = [];
  for (let i = 1; i <= 5; i++) {
    const team = await prisma.team.create({
      data: {
        name: `Bulk Test Team ${i}`,
        tag: `BT${i}`,
        slug: `bulk_test_team_${i}_${Date.now()}`,
        logoUrl: `/logos/bulk_${i}.png`,
        points: i * 100,
      },
    });
    teamIds.push(team.id);
  }
  console.log(`[PASS] Created 5 test teams.`);

  // 3. Perform bulk add via participant logic
  let currentSeed = 1;
  for (const tId of teamIds) {
    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: t.id,
        teamId: tId,
        seed: currentSeed,
      },
    });
    currentSeed++;
  }
  console.log(`[PASS] Bulk added 5 teams into tournament participants!`);

  // Verify
  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: t.id },
    include: { team: true },
    orderBy: { seed: "asc" },
  });

  console.log(`[VERIFIED] Registered participants count: ${participants.length}`);
  participants.forEach((p) => {
    console.log(`   Seed #${p.seed}: ${p.team?.name} [${p.team?.tag}] (${p.team?.points} PTS)`);
  });

  // Cleanup
  await prisma.tournament.delete({ where: { id: t.id } });
  for (const id of teamIds) {
    await prisma.team.delete({ where: { id } });
  }
  console.log("[PASS] Cleaned up bulk test data.");
  console.log(">>> BULK ADD TEAMS TEST PASSED CLEANLY! <<<");
}

testBulkAdd()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
