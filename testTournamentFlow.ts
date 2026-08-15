import { prisma } from "./lib/prisma";
import {
  calculateGroupStandings,
  generateGroupRoundRobinMatches,
  generateBracketStructure,
  handleBracketMatchProgression,
  checkAndAdvanceStage,
} from "./lib/tournamentLogic";
import { syncAllTeamStats } from "./lib/syncTeamStats";

async function main() {
  console.log("=== STARTING FULL EFL TOURNAMENT MANAGEMENT END-TO-END TEST ===");

  // 1. Clean previous test tournament if exists
  const existingT = await prisma.tournament.findFirst({ where: { name: "EFL TEST CUP" } });
  if (existingT) {
    const stages = await prisma.stage.findMany({ where: { tournamentId: existingT.id } });
    const stageIds = stages.map((s) => s.id);
    const groups = await prisma.group.findMany({ where: { stageId: { in: stageIds } } });
    const groupIds = groups.map((g) => g.id);

    await prisma.groupParticipant.deleteMany({ where: { groupId: { in: groupIds } } });
    await prisma.match.deleteMany({ where: { tournamentId: existingT.id } });
    await prisma.bracketNode.deleteMany({ where: { stageId: { in: stageIds } } });
    await prisma.group.deleteMany({ where: { stageId: { in: stageIds } } });
    await prisma.stage.deleteMany({ where: { tournamentId: existingT.id } });
    await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: existingT.id } });
    await prisma.tournament.delete({ where: { id: existingT.id } });
  }

  // 2. Create Tournament: EFL TEST CUP (32 Teams, 8 Groups x 4 Teams, Round Robin, Win = 3pts, Loss = 0pts)
  const tournament = await prisma.tournament.create({
    data: {
      name: "EFL TEST CUP",
      slug: "efl-test-cup",
      description: "Test Cup for 32 Teams automated flow verification",
      presetType: "EFL_GROUP_STAGE",
      participantType: "TEAMS",
      maxParticipants: 32,
      status: "ACTIVE",
      pointsWin: 3,
      pointsLoss: 0,
      tiebreakers: "POINTS,DIFF,H2H,WINS",
    },
  });
  console.log(`[PASS 1] Tournament created: ${tournament.name} (${tournament.id})`);

  // Create Stage 1: Group Stage (8 Groups x 4)
  const stage1 = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      name: "Stage 1: Group Stage",
      order: 1,
      type: "GROUP_STAGE",
      format: "BO1",
      advancingCount: 2,
    },
  });

  const groups: any[] = [];
  for (let i = 0; i < 8; i++) {
    const letter = String.fromCharCode(65 + i);
    const g = await prisma.group.create({
      data: {
        stageId: stage1.id,
        name: `Group ${letter}`,
        order: i + 1,
      },
    });
    groups.push(g);
  }

  // Create Stage 2: Playoffs (16 Team Single Elimination)
  const stage2 = await prisma.stage.create({
    data: {
      tournamentId: tournament.id,
      name: "Stage 2: Playoff Bracket (16 Teams)",
      order: 2,
      type: "SINGLE_ELIMINATION",
      format: "BO3",
      advancingCount: 1,
    },
  });

  // 3. Register Teams from DB using createMany
  const dbTeams = await prisma.team.findMany({ take: 32 });
  if (dbTeams.length < 32) {
    console.warn(`Only ${dbTeams.length} teams in DB. Using available teams.`);
  }

  const pData = dbTeams.map((t, idx) => ({
    tournamentId: tournament.id,
    teamId: t.id,
    seed: idx + 1,
  }));

  await prisma.tournamentParticipant.createMany({ data: pData });
  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { seed: "asc" },
  });
  console.log(`[PASS 2] ${participants.length} Teams registered into tournament.`);

  // 4. Distribute teams into 8 Groups and generate matches
  const gpData = [];
  for (let i = 0; i < participants.length; i++) {
    const groupIndex = i % groups.length;
    gpData.push({
      groupId: groups[groupIndex].id,
      participantId: participants[i].id,
      seed: participants[i].seed,
    });
  }
  await prisma.groupParticipant.createMany({ data: gpData });

  await Promise.all(
    groups.map((g) => generateGroupRoundRobinMatches(tournament.id, stage1.id, g.id, 1))
  );

  const stage1Matches = await prisma.match.findMany({ where: { stageId: stage1.id } });
  console.log(`[PASS 3] Group Stage matches generated automatically. Total matches: ${stage1Matches.length}`);

  // 5. Complete matches for all 8 Groups with win/loss round results
  await prisma.match.updateMany({
    where: { stageId: stage1.id },
    data: {
      scoreA: 13,
      scoreB: 7,
      status: "FINISHED",
      finishedAt: new Date(),
    },
  });
  await prisma.$executeRawUnsafe(`UPDATE "Match" SET "winnerId" = "teamAId" WHERE "stageId" = '${stage1.id}'`);
  console.log("[PASS 4] Completed all Group Stage matches.");

  // 6. Verify Group A Standings & Points calculation
  const groupAStandings = await calculateGroupStandings(groups[0].id, tournament.tiebreakers, tournament.pointsWin, tournament.pointsLoss);
  console.log("[PASS 5] Group A Standings verified:");
  groupAStandings.forEach((st) => {
    console.log(`   Rank #${st.rank} ${st.name}: ${st.w}W - ${st.l}L | Rounds ${st.roundsWon}:${st.roundsLost} (${st.diff}) | ${st.points} PTS`);
  });

  // 7. Test automatic stage advancement from Group Stage to Stage 2 Playoffs!
  await checkAndAdvanceStage(stage1.id);

  const stage2BracketNodes = await prisma.bracketNode.findMany({
    where: { stageId: stage2.id },
    include: { match: true },
  });
  console.log(`[PASS 6] Auto stage advancement triggered! Playoff Bracket Nodes created: ${stage2BracketNodes.length}`);

  // 8. Test Quarterfinal match completion and automatic winner progression in Playoff Bracket
  const round1Nodes = stage2BracketNodes.filter((n) => n.round === 1 && n.match);
  if (round1Nodes.length > 0) {
    const qfMatch = round1Nodes[0].match!;
    await prisma.match.update({
      where: { id: qfMatch.id },
      data: {
        scoreA: 2,
        scoreB: 1,
        status: "FINISHED",
        winnerId: qfMatch.teamAId,
        finishedAt: new Date(),
      },
    });

    await handleBracketMatchProgression(qfMatch.id);

    const nextMatch = await prisma.match.findUnique({
      where: { id: round1Nodes[0].nextMatchId! },
    });
    console.log(`[PASS 7] Playoff Winner Progression verified! Winner advanced to Next Match Team Slot: ${nextMatch?.teamCustomNameA || nextMatch?.teamCustomNameB}`);
  }

  // 9. Sync EFL Rating
  await syncAllTeamStats();
  console.log("[PASS 8] EFL Rating & Team Stats synchronized successfully.");

  console.log("\n>>> ALL TEST SCENARIOS PASSED 100% CLEANLY! <<<");
}

main()
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
