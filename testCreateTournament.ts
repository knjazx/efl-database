import { prisma } from "./lib/prisma";
import { slugify } from "./lib/slug";

async function testCreate() {
  console.log("=== TESTING TOURNAMENT CREATION LOGIC ===");

  const name = "Тестовый Турнир EFL Swiss 2026";
  const baseSlug = slugify(name);
  console.log(`Generated base slug: '${baseSlug}'`);

  let uniqueSlug = baseSlug;
  let counter = 1;
  while (await prisma.tournament.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  console.log(`Unique slug: '${uniqueSlug}'`);

  const t = await prisma.tournament.create({
    data: {
      name,
      slug: uniqueSlug,
      description: "Тестовое описание",
      participantType: "TEAMS",
      maxParticipants: 16,
      status: "ACTIVE",
      presetType: "EFL_SWISS",
      pointsWin: 3,
      pointsLoss: 0,
      tiebreakers: "POINTS,DIFF,H2H,WINS",
    },
  });

  console.log(`[PASS] Tournament created in DB successfully! ID: ${t.id}, Slug: ${t.slug}`);

  // Create Swiss Stage
  const swissSettings = {
    winsRequired: 3,
    lossesRequired: 3,
    maxRounds: 5,
    fixedRounds: false,
    advancingCount: 8,
    eliminatedCount: 8,
    allowDraws: false,
    seedingMode: "INITIAL_SEED",
    playoffSeedingMode: "SWISS_STANDINGS",
  };

  const st1 = await prisma.stage.create({
    data: {
      tournamentId: t.id,
      name: "Stage 1: Swiss Stage (16 Teams)",
      order: 1,
      type: "SWISS",
      format: "BO1",
      advancingCount: 8,
      settings: JSON.stringify({ swiss: swissSettings }),
    },
  });
  console.log(`[PASS] Stage 1 (SWISS) created! ID: ${st1.id}`);

  // Log activity
  await prisma.activityLog.create({
    data: {
      description: `Создан турнир '${t.name}' (EFL_SWISS)`,
    },
  });

  console.log("[PASS] Activity Log created!");
  console.log(">>> TOURNAMENT CREATION TEST PASSED CLEANLY! <<<");
}

testCreate()
  .catch((e) => {
    console.error("Creation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
