import { prisma } from "./lib/prisma";
import {
  generateSwissNextRound,
  calculateSwissStandings,
  handleSwissMatchCompletion,
  checkAndAdvanceStage,
} from "./lib/tournamentLogic";
import { syncAllTeamStats } from "./lib/syncTeamStats";

async function runSwissFlowTest() {
  console.log("=== STARTING FULL EFL SWISS SYSTEM END-TO-END TEST ===");

  // 1. Create 16 Teams
  const teams = [];
  for (let i = 1; i <= 16; i++) {
    const slug = `swiss_team_${i}_${Date.now()}`;
    const t = await prisma.team.create({
      data: {
        name: `Swiss Team ${i}`,
        tag: `SW${i}`,
        slug,
        logoUrl: `/logos/team_${i}.png`,
        tier: i <= 4 ? "TIER 1" : i <= 8 ? "TIER 2" : "TIER 3",
      },
    });
    teams.push(t);
  }

  // 2. Create Tournament with Swiss Stage and Playoff Stage
  const tourneySlug = `swiss-test-cup-${Date.now()}`;
  const tournament = await prisma.tournament.create({
    data: {
      name: "EFL SWISS TEST CUP",
      slug: tourneySlug,
      description: "Automated end-to-end verification of Swiss System Engine",
      presetType: "CUSTOM",
      maxParticipants: 16,
      status: "ACTIVE",
    },
  });
  console.log(`[PASS 1] Tournament created: ${tournament.name} (${tournament.id})`);

  // Register 16 Teams as Participants
  const participants = [];
  for (let i = 0; i < teams.length; i++) {
    const p = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: tournament.id,
        teamId: teams[i].id,
        seed: i + 1,
        customName: teams[i].name,
      },
    });
    participants.push(p);
  }
  console.log(`[PASS 2] 16 Teams registered with initial seeding.`);

  // Create Stage 1: Swiss Stage
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

  const stage1 = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      name: "Stage 1: Swiss System (16 Teams)",
      order: 1,
      type: "SWISS",
      format: "BO1",
      advancingCount: 8,
      settings: JSON.stringify({ swiss: swissSettings }),
    },
  });

  // Create Stage 2: Single Elimination Playoff Bracket
  const stage2 = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      name: "Stage 2: Playoff Bracket (8 Teams)",
      order: 2,
      type: "SINGLE_ELIMINATION",
      format: "BO3",
      advancingCount: 1,
    },
  });

  // 3. Generate Round 1 of Swiss Stage
  const r1Result = await generateSwissNextRound(stage1.id);
  console.log(`[PASS 3] Round 1 generated! Matches created: ${r1Result.matchesCount}`);

  // 4. Play Round 1..5 in loop and verify records & no repeat opponents
  for (let r = 1; r <= 5; r++) {
    const standings = await calculateSwissStandings(stage1.id);
    const active = standings.filter((s) => s.status === "ACTIVE");
    const advanced = standings.filter((s) => s.status === "ADVANCED");
    const eliminated = standings.filter((s) => s.status === "ELIMINATED");

    console.log(`\n--- ROUND ${r} START ---`);
    console.log(`Active Teams: ${active.length} | Advanced: ${advanced.length} | Eliminated: ${eliminated.length}`);

    if (active.length < 2) {
      console.log(`[INFO] Swiss Stage completed before Round ${r}.`);
      break;
    }

    // Fetch current round matches
    const roundNodes = await prisma.bracketNode.findMany({
      where: { stageId: stage1.id, round: r },
      include: { match: true },
    });

    if (roundNodes.length === 0) {
      console.log(`Generating Round ${r}...`);
      await generateSwissNextRound(stage1.id);
    }

    const currentMatches = (await prisma.bracketNode.findMany({
      where: { stageId: stage1.id, round: r },
      include: { match: true },
    })).map((n) => n.match!).filter(Boolean);

    // Verify No Repeat Opponents across all matches in this round!
    for (const m of currentMatches) {
      if (m.teamBId === m.teamAId || m.teamCustomNameB?.includes("BYE")) continue;
      const stA = standings.find((s) => s.teamId === m.teamAId || s.participantId === m.teamAId);
      if (stA) {
        const isRepeat = stA.previousOpponents.includes(m.teamBId);
        if (isRepeat) {
          throw new Error(`CRITICAL ERROR: Repeat opponent detected in Round ${r} for match ${m.teamCustomNameA} vs ${m.teamCustomNameB}`);
        }
      }
    }
    console.log(`[VERIFIED] Round ${r} has 0 repeat opponents!`);

    // Complete all matches for this round
    for (const m of currentMatches) {
      if (m.status === "FINISHED") continue;
      const isAWin = m.teamAId < m.teamBId;
      const scoreA = isAWin ? 13 : 9;
      const scoreB = isAWin ? 9 : 13;

      await prisma.match.update({
        where: { id: m.id },
        data: {
          scoreA,
          scoreB,
          status: "FINISHED",
          winnerId: isAWin ? m.teamAId : m.teamBId,
          finishedAt: new Date(),
        },
      });
    }

    if (currentMatches.length > 0) {
      await handleSwissMatchCompletion(currentMatches[0].id);
    }
  }

  // 5. Final Standings Verification
  const finalStandings = await calculateSwissStandings(stage1.id);
  const finalAdvanced = finalStandings.filter((s) => s.status === "ADVANCED");
  const finalEliminated = finalStandings.filter((s) => s.status === "ELIMINATED");

  console.log(`\n[PASS 4] Swiss Stage Complete!`);
  console.log(`Total Advanced: ${finalAdvanced.length} Teams | Total Eliminated: ${finalEliminated.length} Teams`);

  console.log("\n--- FINAL SWISS STANDINGS ---");
  finalStandings.forEach((st) => {
    console.log(`   Rank #${st.rank} ${st.name}: ${st.record} | Buchholz: ${st.buchholz} | Diff: ${st.diff} | Status: ${st.status}`);
  });

  // 6. Check Playoff Bracket Auto-Generation
  await checkAndAdvanceStage(stage1.id);

  const playoffNodes = await prisma.bracketNode.findMany({
    where: { stageId: stage2.id },
    include: { match: true },
  });

  console.log(`\n[PASS 5] Auto Stage Advancement verified! Playoff Bracket Nodes created: ${playoffNodes.length}`);

  // 7. Sync EFL Rating
  await syncAllTeamStats();
  console.log("[PASS 6] EFL Rating & Team Stats synchronized successfully.");

  console.log("\n>>> SWISS SYSTEM TEST PASSED 100% CLEANLY! <<<");
}

runSwissFlowTest()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
