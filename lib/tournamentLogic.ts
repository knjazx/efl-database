import { prisma } from "./prisma";
import { syncAllTeamStats } from "./syncTeamStats";
import { UNKNOWN_TEAM_ID, ensureUnknownTeam } from "./unknownTeam";

export interface GroupStandingItem {
  participantId: string;
  teamId?: string | null;
  playerId?: string | null;
  name: string;
  tag: string;
  logoUrl?: string | null;
  mp: number;
  w: number;
  l: number;
  roundsWon: number;
  roundsLost: number;
  diff: number;
  points: number;
  rank: number;
  h2hWins: Record<string, number>;
}

export interface SwissSettings {
  winsRequired: number;
  lossesRequired: number;
  maxRounds: number;
  fixedRounds: boolean;
  advancingCount: number;
  eliminatedCount: number;
  allowDraws: boolean;
  seedingMode: "INITIAL_SEED" | "RANDOM" | "RATING";
  playoffSeedingMode: "SWISS_STANDINGS" | "RANDOM" | "INITIAL_SEED";
}

export interface SwissStandingItem {
  participantId: string;
  teamId?: string | null;
  playerId?: string | null;
  name: string;
  tag: string;
  logoUrl?: string | null;
  seed: number;
  mp: number;
  w: number;
  l: number;
  d: number;
  roundsWon: number;
  roundsLost: number;
  diff: number;
  buchholz: number;
  record: string;
  status: "ACTIVE" | "ADVANCED" | "ELIMINATED";
  previousOpponents: string[];
  hadBye: boolean;
  rank: number;
  matches: Array<{
    round: number;
    opponent: string;
    opponentId?: string;
    result: "WIN" | "LOSS" | "DRAW";
    score: string;
    matchId?: string;
  }>;
}

/**
 * Calculates standings for a specific Group with dynamic tiebreakers.
 */
export async function calculateGroupStandings(
  groupId: string,
  tiebreakerOrder: string = "POINTS,DIFF,H2H,WINS",
  pointsWin: number = 3,
  pointsLoss: number = 0
): Promise<GroupStandingItem[]> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      participants: {
        include: {
          participant: {
            include: {
              team: true,
              player: true,
            },
          },
        },
      },
      matches: {
        include: {
          teamA: true,
          teamB: true,
        },
      },
    },
  });

  if (!group) return [];

  const standingsMap: Record<string, GroupStandingItem> = {};

  for (const gp of group.participants) {
    const p = gp.participant;
    const name = p.customName || p.team?.name || p.player?.nickname || "Team";
    const tag = p.team?.tag || p.player?.nickname?.substring(0, 4) || "TAG";
    const logoUrl = p.team?.logoUrl || p.player?.avatarUrl || null;

    standingsMap[p.id] = {
      participantId: p.id,
      teamId: p.teamId,
      playerId: p.playerId,
      name,
      tag,
      logoUrl,
      mp: 0,
      w: 0,
      l: 0,
      roundsWon: 0,
      roundsLost: 0,
      diff: 0,
      points: 0,
      rank: 0,
      h2hWins: {},
    };
  }

  // Map matches to participants
  for (const match of group.matches) {
    if (match.status !== "FINISHED") continue;

    const pA = group.participants.find(
      (gp) => gp.participant.teamId === match.teamAId || gp.participant.playerId === match.teamAId || gp.participant.id === match.teamAId
    )?.participant;

    const pB = group.participants.find(
      (gp) => gp.participant.teamId === match.teamBId || gp.participant.playerId === match.teamBId || gp.participant.id === match.teamBId
    )?.participant;

    if (!pA || !pB) continue;

    const stA = standingsMap[pA.id];
    const stB = standingsMap[pB.id];

    if (!stA || !stB) continue;

    stA.mp += 1;
    stB.mp += 1;

    stA.roundsWon += match.scoreA;
    stA.roundsLost += match.scoreB;
    stB.roundsWon += match.scoreB;
    stB.roundsLost += match.scoreA;

    const isAWin = match.winnerId ? match.winnerId === match.teamAId || match.winnerId === pA.id : match.scoreA > match.scoreB;
    const isBWin = match.winnerId ? match.winnerId === match.teamBId || match.winnerId === pB.id : match.scoreB > match.scoreA;

    if (isAWin) {
      stA.w += 1;
      stA.points += pointsWin;
      stB.l += 1;
      stB.points += pointsLoss;
      stA.h2hWins[pB.id] = (stA.h2hWins[pB.id] || 0) + 1;
    } else if (isBWin) {
      stB.w += 1;
      stB.points += pointsWin;
      stA.l += 1;
      stA.points += pointsLoss;
      stB.h2hWins[pA.id] = (stB.h2hWins[pA.id] || 0) + 1;
    }
  }

  const items = Object.values(standingsMap).map((st) => {
    st.diff = st.roundsWon - st.roundsLost;
    return st;
  });

  const criteria = tiebreakerOrder.split(",").map((c) => c.trim().toUpperCase());

  items.sort((a, b) => {
    for (const crit of criteria) {
      if (crit === "POINTS") {
        if (b.points !== a.points) return b.points - a.points;
      } else if (crit === "DIFF" || crit === "ROUND_DIFFERENCE") {
        if (b.diff !== a.diff) return b.diff - a.diff;
      } else if (crit === "H2H" || crit === "HEAD_TO_HEAD") {
        const aVsB = a.h2hWins[b.participantId] || 0;
        const bVsA = b.h2hWins[a.participantId] || 0;
        if (aVsB !== bVsA) return bVsA - aVsB;
      } else if (crit === "WINS" || crit === "TOTAL_WINS") {
        if (b.w !== a.w) return b.w - a.w;
      } else if (crit === "ROUNDS_WON") {
        if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
      }
    }
    return a.name.localeCompare(b.name);
  });

  items.forEach((item, index) => {
    item.rank = index + 1;
  });

  return items;
}

/**
 * Automatically generates round-robin matches for a group stage.
 */
export async function generateGroupRoundRobinMatches(
  tournamentId: string,
  stageId: string,
  groupId: string,
  bestOf: number = 1
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      participants: {
        include: {
          participant: {
            include: { team: true, player: true },
          },
        },
        orderBy: { seed: "asc" },
      },
    },
  });

  if (!group || group.participants.length < 2) return [];

  await prisma.match.deleteMany({
    where: { groupId, status: "SCHEDULED" },
  });

  const participants = group.participants.map((gp) => ({
    participantId: gp.participant.id,
    teamId: gp.participant.teamId,
    playerId: gp.participant.playerId,
    customName: gp.participant.customName || gp.participant.team?.name || gp.participant.player?.nickname || "Team",
  }));

  const matchDataList = [];
  const n = participants.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p1 = participants[i];
      const p2 = participants[j];

      const teamAId = p1.teamId || p1.participantId;
      const teamBId = p2.teamId || p2.participantId;

      matchDataList.push({
        tournamentId,
        stageId,
        groupId,
        teamAId,
        teamBId,
        teamCustomNameA: p1.customName,
        teamCustomNameB: p2.customName,
        scoreA: 0,
        scoreB: 0,
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + (matchDataList.length + 1) * 3600 * 1000),
        bestOf,
        tier: "TIER 1",
      });
    }
  }

  if (matchDataList.length > 0) {
    await prisma.match.createMany({
      data: matchDataList,
    });
  }

  return prisma.match.findMany({ where: { groupId } });
}

/**
 * Creates Single Elimination or Double Elimination Bracket Tree structure.
 */
export async function generateBracketStructure(
  tournamentId: string,
  stageId: string,
  participantIds: string[],
  stageType: string = "SINGLE_ELIMINATION",
  bestOf: number = 3
) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
  });
  if (!stage) return;

  const existingNodes = await prisma.bracketNode.findMany({ where: { stageId } });
  const existingMatchIds = existingNodes.map((n) => n.matchId).filter(Boolean) as string[];

  await prisma.bracketNode.deleteMany({ where: { stageId } });
  if (existingMatchIds.length > 0) {
    await prisma.match.deleteMany({ where: { id: { in: existingMatchIds } } });
  }

  const participants = await prisma.tournamentParticipant.findMany({
    where: { id: { in: participantIds } },
    include: { team: true, player: true },
    orderBy: { seed: "asc" },
  });

  const numTeams = participants.length;

  if (stageType === "SINGLE_ELIMINATION") {
    let size = 2;
    while (size < numTeams) size *= 2;

    const totalRounds = Math.log2(size);
    const nodeIdsByRoundPos: Record<string, string> = {};

    const matchesToCreate = [];
    const nodesToCreate = [];

    for (let r = totalRounds; r >= 1; r--) {
      const matchCountInRound = Math.pow(2, totalRounds - r);

      for (let pos = 0; pos < matchCountInRound; pos++) {
        let teamAId = "unknown-team-placeholder";
        let teamBId = "unknown-team-placeholder";
        let teamCustomNameA = "TBD";
        let teamCustomNameB = "TBD";

        if (r === 1) {
          const idxA = pos * 2;
          const idxB = pos * 2 + 1;

          if (participants[idxA]) {
            const pA = participants[idxA];
            teamAId = pA.teamId || pA.id;
            teamCustomNameA = pA.customName || pA.team?.name || pA.player?.nickname || "TBD";
          }
          if (participants[idxB]) {
            const pB = participants[idxB];
            teamBId = pB.teamId || pB.id;
            teamCustomNameB = pB.customName || pB.team?.name || pB.player?.nickname || "TBD";
          }
        }

        const nextRoundPos = Math.floor(pos / 2);
        const nextRoundKey = `${r + 1}_${nextRoundPos}`;
        const nextMatchId = nodeIdsByRoundPos[nextRoundKey] || null;
        const nextMatchSlot = pos % 2 === 0 ? "A" : "B";

        const matchId = `match_${stageId}_r${r}_pos${pos}_${Date.now()}`;
        matchesToCreate.push({
          id: matchId,
          tournamentId,
          stageId,
          teamAId,
          teamBId,
          teamCustomNameA,
          teamCustomNameB,
          scoreA: 0,
          scoreB: 0,
          status: "SCHEDULED",
          scheduledAt: new Date(Date.now() + r * 7200 * 1000 + pos * 3600 * 1000),
          bestOf: r === totalRounds ? Math.max(bestOf, 3) : bestOf,
          tier: "TIER 1",
        });

        nodesToCreate.push({
          stageId,
          round: r,
          position: pos,
          bracketType: "WINNERS",
          matchId,
          nextMatchId,
          nextMatchSlot,
        });

        nodeIdsByRoundPos[`${r}_${pos}`] = matchId;
      }
    }

    if (matchesToCreate.length > 0) {
      await prisma.match.createMany({ data: matchesToCreate });
      await prisma.bracketNode.createMany({ data: nodesToCreate });
    }
  } else if (stageType === "DOUBLE_ELIMINATION") {
    let size = 2;
    while (size < numTeams) size *= 2;
    const totalRoundsWB = Math.log2(size);

    const wbMatchIds: Record<string, string> = {};

    for (let r = totalRoundsWB; r >= 1; r--) {
      const matchesInRound = Math.pow(2, totalRoundsWB - r);

      for (let pos = 0; pos < matchesInRound; pos++) {
        let teamAId = "unknown-team-placeholder";
        let teamBId = "unknown-team-placeholder";
        let teamCustomNameA = "TBD";
        let teamCustomNameB = "TBD";

        if (r === 1) {
          const idxA = pos * 2;
          const idxB = pos * 2 + 1;

          if (participants[idxA]) {
            const pA = participants[idxA];
            teamAId = pA.teamId || pA.id;
            teamCustomNameA = pA.customName || pA.team?.name || pA.player?.nickname || "TBD";
          }
          if (participants[idxB]) {
            const pB = participants[idxB];
            teamBId = pB.teamId || pB.id;
            teamCustomNameB = pB.customName || pB.team?.name || pB.player?.nickname || "TBD";
          }
        }

        const nextRoundPos = Math.floor(pos / 2);
        const nextRoundKey = `${r + 1}_${nextRoundPos}`;
        const nextMatchId = wbMatchIds[nextRoundKey] || null;
        const nextMatchSlot = pos % 2 === 0 ? "A" : "B";

        const match = await prisma.match.create({
          data: {
            tournamentId,
            stageId,
            teamAId,
            teamBId,
            teamCustomNameA,
            teamCustomNameB,
            scoreA: 0,
            scoreB: 0,
            status: "SCHEDULED",
            scheduledAt: new Date(Date.now() + r * 7200 * 1000 + pos * 3600 * 1000),
            bestOf: r === totalRoundsWB ? Math.max(bestOf, 3) : bestOf,
            tier: "TIER 1",
          },
        });

        await prisma.bracketNode.create({
          data: {
            stageId,
            round: r,
            position: pos,
            bracketType: "WINNERS",
            matchId: match.id,
            nextMatchId,
            nextMatchSlot,
          },
        });

        wbMatchIds[`${r}_${pos}`] = match.id;
      }
    }

    const gfMatch = await prisma.match.create({
      data: {
        tournamentId,
        stageId,
        teamAId: "wb-winner-placeholder",
        teamBId: "lb-winner-placeholder",
        teamCustomNameA: "WB Winner",
        teamCustomNameB: "LB Winner",
        scoreA: 0,
        scoreB: 0,
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + (totalRoundsWB + 2) * 7200 * 1000),
        bestOf: Math.max(bestOf, 3),
        tier: "TIER 1",
      },
    });

    await prisma.bracketNode.create({
      data: {
        stageId,
        round: totalRoundsWB + 1,
        position: 0,
        bracketType: "GRAND_FINAL",
        matchId: gfMatch.id,
      },
    });

    const wbFinalNode = await prisma.bracketNode.findFirst({
      where: { stageId, bracketType: "WINNERS", round: totalRoundsWB },
    });
    if (wbFinalNode) {
      await prisma.bracketNode.update({
        where: { id: wbFinalNode.id },
        data: { nextMatchId: gfMatch.id, nextMatchSlot: "A" },
      });
    }
  }

  return prisma.bracketNode.findMany({
    where: { stageId },
    include: { match: true },
  });
}

/**
 * Handles bracket tree winner progression and loser drop (for Double Elimination).
 */
export async function handleBracketMatchProgression(matchId: string) {
  const node = await prisma.bracketNode.findFirst({
    where: { matchId },
    include: { match: true },
  });

  if (!node || !node.match || node.match.status !== "FINISHED") return;

  if (node.stageId) {
    await repairAndProgressStageBracket(node.stageId);
  }
}

/**
 * Repairs missing bracket matches and automatically progresses winning teams across all rounds.
 */
export async function repairAndProgressStageBracket(stageId: string) {
  await ensureUnknownTeam();

  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      bracketNodes: {
        include: { match: { include: { teamA: true, teamB: true } } },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!stage) return;

  const nodes = stage.bracketNodes;
  if (nodes.length === 0) return;

  const nodeMapByRoundPos: Record<string, any> = {};
  for (const node of nodes) {
    nodeMapByRoundPos[`${node.round}_${node.position}`] = node;
  }

  const maxRound = Math.max(...nodes.map((n) => n.round), 1);

  // 1. Ensure every bracket node has a valid match record in DB
  for (const node of nodes) {
    let match = node.match;
    if (!match && node.matchId) {
      match = await prisma.match.findUnique({
        where: { id: node.matchId },
        include: { teamA: true, teamB: true },
      });
    }

    if (!match) {
      const newMatchId = `match_${stageId}_r${node.round}_pos${node.position}_${Date.now()}`;
      match = await prisma.match.create({
        data: {
          id: newMatchId,
          tournamentId: stage.tournamentId,
          stageId: stage.id,
          teamAId: UNKNOWN_TEAM_ID,
          teamBId: UNKNOWN_TEAM_ID,
          teamCustomNameA: "TBD",
          teamCustomNameB: "TBD",
          scoreA: 0,
          scoreB: 0,
          status: "SCHEDULED",
          scheduledAt: new Date(Date.now() + node.round * 7200 * 1000 + node.position * 3600 * 1000),
          bestOf: stage.format === "BO3" ? 3 : stage.format === "BO5" ? 5 : 1,
          tier: "TIER 1",
        },
        include: { teamA: true, teamB: true },
      });

      await prisma.bracketNode.update({
        where: { id: node.id },
        data: { matchId: match.id },
      });
      node.match = match;
      node.matchId = match.id;
    }
  }

  // 2. Link nextMatchId and nextMatchSlot between rounds
  for (const node of nodes) {
    if (node.round < maxRound && node.bracketType === "WINNERS") {
      const nextRound = node.round + 1;
      const nextPos = Math.floor(node.position / 2);
      const nextSlot = node.position % 2 === 0 ? "A" : "B";
      const nextNode = nodeMapByRoundPos[`${nextRound}_${nextPos}`];

      if (nextNode && nextNode.matchId) {
        if (node.nextMatchId !== nextNode.matchId || node.nextMatchSlot !== nextSlot) {
          await prisma.bracketNode.update({
            where: { id: node.id },
            data: {
              nextMatchId: nextNode.matchId,
              nextMatchSlot: nextSlot,
            },
          });
          node.nextMatchId = nextNode.matchId;
          node.nextMatchSlot = nextSlot;
        }
      }
    }
  }

  // 3. Reload nodes from DB and propagate winners round by round
  const updatedNodes = await prisma.bracketNode.findMany({
    where: { stageId },
    include: { match: { include: { teamA: true, teamB: true } } },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });

  for (let r = 1; r <= maxRound; r++) {
    const roundNodes = updatedNodes.filter((n) => n.round === r);
    for (const node of roundNodes) {
      if (!node.matchId) continue;
      const currentMatch = await prisma.match.findUnique({
        where: { id: node.matchId },
        include: { teamA: true, teamB: true },
      });
      if (!currentMatch || currentMatch.status !== "FINISHED") continue;

      const isAWin = currentMatch.winnerId ? currentMatch.winnerId === currentMatch.teamAId : currentMatch.scoreA > currentMatch.scoreB;
      const winnerTeamId = isAWin ? currentMatch.teamAId : currentMatch.teamBId;
      const winnerName = isAWin
        ? (currentMatch.teamCustomNameA || currentMatch.teamA?.name)
        : (currentMatch.teamCustomNameB || currentMatch.teamB?.name);

      const loserTeamId = isAWin ? currentMatch.teamBId : currentMatch.teamAId;
      const loserName = isAWin
        ? (currentMatch.teamCustomNameB || currentMatch.teamB?.name)
        : (currentMatch.teamCustomNameA || currentMatch.teamA?.name);

      // Advance winner to next match
      if (node.nextMatchId && node.nextMatchSlot) {
        const targetMatch = await prisma.match.findUnique({ where: { id: node.nextMatchId } });
        if (targetMatch) {
          const updateData: any = {};
          if (node.nextMatchSlot === "A") {
            updateData.teamAId = winnerTeamId || UNKNOWN_TEAM_ID;
            updateData.teamCustomNameA = winnerName || "TBD";
          } else {
            updateData.teamBId = winnerTeamId || UNKNOWN_TEAM_ID;
            updateData.teamCustomNameB = winnerName || "TBD";
          }
          await prisma.match.update({
            where: { id: node.nextMatchId },
            data: updateData,
          });
        }
      }

      // Advance loser for Double Elimination lower bracket
      if (node.loserMatchId && node.loserMatchSlot) {
        const loserMatch = await prisma.match.findUnique({ where: { id: node.loserMatchId } });
        if (loserMatch) {
          const updateData: any = {};
          if (node.loserMatchSlot === "A") {
            updateData.teamAId = loserTeamId || UNKNOWN_TEAM_ID;
            updateData.teamCustomNameA = loserName || "TBD";
          } else {
            updateData.teamBId = loserTeamId || UNKNOWN_TEAM_ID;
            updateData.teamCustomNameB = loserName || "TBD";
          }
          await prisma.match.update({
            where: { id: node.loserMatchId },
            data: updateData,
          });
        }
      }
    }
  }
}

// ==========================================
// SWISS SYSTEM ENGINE IMPLEMENTATION
// ==========================================

/**
 * Calculates current standings, team records, opponents history, and statuses for a Swiss Stage.
 */
export async function calculateSwissStandings(stageId: string): Promise<SwissStandingItem[]> {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      tournament: {
        include: {
          participants: {
            include: { team: true, player: true },
            orderBy: { seed: "asc" },
          },
        },
      },
      bracketNodes: {
        include: {
          match: {
            include: { teamA: true, teamB: true },
          },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!stage) return [];

  let settings: SwissSettings = {
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
  if (stage.settings) {
    try {
      const parsed = JSON.parse(stage.settings);
      if (parsed.swiss) settings = { ...settings, ...parsed.swiss };
      else settings = { ...settings, ...parsed };
    } catch (e) {}
  }

  const standingsMap: Record<string, SwissStandingItem> = {};

  stage.tournament.participants.forEach((p, idx) => {
    const name = p.customName || p.team?.name || p.player?.nickname || "Team";
    const tag = p.team?.tag || p.player?.nickname?.substring(0, 4) || "TAG";
    const logoUrl = p.team?.logoUrl || p.player?.avatarUrl || null;
    const participantKey = p.teamId || p.playerId || p.id;

    standingsMap[participantKey] = {
      participantId: p.id,
      teamId: p.teamId,
      playerId: p.playerId,
      name,
      tag,
      logoUrl,
      seed: p.seed || idx + 1,
      mp: 0,
      w: 0,
      l: 0,
      d: 0,
      roundsWon: 0,
      roundsLost: 0,
      diff: 0,
      buchholz: 0,
      record: "0-0",
      status: "ACTIVE",
      previousOpponents: [],
      hadBye: false,
      rank: 0,
      matches: [],
    };
  });

  const nodes = stage.bracketNodes.filter((n) => n.match);

  for (const node of nodes) {
    const m = node.match!;
    if (m.status !== "FINISHED") continue;

    const stA = standingsMap[m.teamAId];
    const stB = standingsMap[m.teamBId];

    if (m.teamBId === m.teamAId || m.teamCustomNameB?.includes("BYE")) {
      if (stA) {
        stA.mp += 1;
        stA.w += 1;
        stA.roundsWon += 13;
        stA.hadBye = true;
        stA.matches.push({ round: node.round, opponent: "BYE (ТЕХ. ПОБЕДА)", result: "WIN", score: "13:0", matchId: m.id });
      }
      continue;
    }

    if (stA && stB) {
      stA.mp += 1;
      stB.mp += 1;

      stA.previousOpponents.push(m.teamBId);
      stB.previousOpponents.push(m.teamAId);

      stA.roundsWon += m.scoreA;
      stA.roundsLost += m.scoreB;
      stB.roundsWon += m.scoreB;
      stB.roundsLost += m.scoreA;

      const isAWin = m.winnerId ? m.winnerId === m.teamAId : m.scoreA > m.scoreB;
      const isBWin = m.winnerId ? m.winnerId === m.teamBId : m.scoreB > m.scoreA;
      const isDraw = m.scoreA === m.scoreB && !m.winnerId;

      if (isAWin) {
        stA.w += 1;
        stB.l += 1;
        stA.matches.push({ round: node.round, opponent: stB.name, opponentId: m.teamBId, result: "WIN", score: `${m.scoreA}:${m.scoreB}`, matchId: m.id });
        stB.matches.push({ round: node.round, opponent: stA.name, opponentId: m.teamAId, result: "LOSS", score: `${m.scoreB}:${m.scoreA}`, matchId: m.id });
      } else if (isBWin) {
        stB.w += 1;
        stA.l += 1;
        stB.matches.push({ round: node.round, opponent: stA.name, opponentId: m.teamAId, result: "WIN", score: `${m.scoreB}:${m.scoreA}`, matchId: m.id });
        stA.matches.push({ round: node.round, opponent: stB.name, opponentId: m.teamBId, result: "LOSS", score: `${m.scoreA}:${m.scoreB}`, matchId: m.id });
      } else if (isDraw) {
        stA.d += 1;
        stB.d += 1;
        stA.matches.push({ round: node.round, opponent: stB.name, opponentId: m.teamBId, result: "DRAW", score: `${m.scoreA}:${m.scoreB}`, matchId: m.id });
        stB.matches.push({ round: node.round, opponent: stA.name, opponentId: m.teamAId, result: "DRAW", score: `${m.scoreB}:${m.scoreA}`, matchId: m.id });
      }
    }
  }

  const items = Object.values(standingsMap);

  items.forEach((st) => {
    st.diff = st.roundsWon - st.roundsLost;
    st.record = `${st.w}-${st.l}${st.d > 0 ? `-${st.d}` : ""}`;

    let buchholz = 0;
    st.previousOpponents.forEach((oppId) => {
      if (standingsMap[oppId]) {
        buchholz += standingsMap[oppId].w;
      }
    });
    st.buchholz = buchholz;

    if (!settings.fixedRounds) {
      if (st.w >= settings.winsRequired) {
        st.status = "ADVANCED";
      } else if (st.l >= settings.lossesRequired) {
        st.status = "ELIMINATED";
      } else {
        st.status = "ACTIVE";
      }
    } else {
      st.status = "ACTIVE";
    }
  });

  const maxCompletedRound = Math.max(0, ...nodes.filter((n) => n.match?.status === "FINISHED").map((n) => n.round));
  if (settings.fixedRounds && maxCompletedRound >= settings.maxRounds) {
    const sortedFixed = [...items].sort((a, b) => b.w - a.w || b.diff - a.diff || a.seed - b.seed);
    sortedFixed.forEach((item, idx) => {
      if (idx < settings.advancingCount) item.status = "ADVANCED";
      else item.status = "ELIMINATED";
    });
  }

  items.sort((a, b) => {
    const statusScore = (s: string) => (s === "ADVANCED" ? 2 : s === "ACTIVE" ? 1 : 0);
    if (statusScore(b.status) !== statusScore(a.status)) {
      return statusScore(b.status) - statusScore(a.status);
    }
    if (b.w !== a.w) return b.w - a.w;
    if (a.l !== b.l) return a.l - b.l;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.roundsWon !== a.roundsWon) return b.roundsWon - a.roundsWon;
    return a.seed - b.seed;
  });

  items.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return items;
}

/**
 * Deterministic Backtracking Swiss Pairing Solver.
 * Finds pairings that guarantee NO REPEAT OPPONENTS while minimizing record differences.
 */
export function solveSwissPairings(teams: SwissStandingItem[]): Array<[SwissStandingItem, SwissStandingItem]> {
  const sorted = [...teams].sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w;
    if (a.l !== b.l) return a.l - b.l;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return a.seed - b.seed;
  });

  const bestPairing: Array<[SwissStandingItem, SwissStandingItem]> = [];
  let minCost = Infinity;

  function backtrack(unpaired: SwissStandingItem[], currentPairs: Array<[SwissStandingItem, SwissStandingItem]>, currentCost: number) {
    if (unpaired.length === 0) {
      if (currentCost < minCost) {
        minCost = currentCost;
        bestPairing.length = 0;
        bestPairing.push(...currentPairs);
      }
      return;
    }

    if (currentCost >= minCost) return;

    const t1 = unpaired[0];
    const rest = unpaired.slice(1);

    for (let i = 0; i < rest.length; i++) {
      const t2 = rest[i];
      let cost = 0;

      const id1 = t1.teamId || t1.participantId;
      const id2 = t2.teamId || t2.participantId;

      // Repeat opponent penalty
      const isRepeat = t1.previousOpponents.includes(id2) || t2.previousOpponents.includes(id1);
      if (isRepeat) cost += 1000000;

      // Record difference penalty
      const recordDiff = Math.abs(t1.w - t2.w) + Math.abs(t1.l - t2.l);
      cost += recordDiff * 1000;

      // Position gap penalty
      cost += i;

      const nextUnpaired = rest.filter((_, idx) => idx !== i);
      currentPairs.push([t1, t2]);
      backtrack(nextUnpaired, currentPairs, currentCost + cost);
      currentPairs.pop();

      if (minCost === 0) break;
    }
  }

  backtrack(sorted, [], 0);
  return bestPairing;
}

/**
 * Server function to generate or regenerate the next round of a Swiss Stage.
 */
export async function generateSwissNextRound(stageId: string, isRegenerate: boolean = false) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      tournament: {
        include: {
          participants: {
            include: { team: true, player: true },
            orderBy: { seed: "asc" },
          },
        },
      },
      bracketNodes: {
        include: { match: true },
      },
    },
  });

  if (!stage || stage.type !== "SWISS") return { success: false, error: "Stage is not Swiss format" };

  let settings: SwissSettings = {
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
  if (stage.settings) {
    try {
      const parsed = JSON.parse(stage.settings);
      if (parsed.swiss) settings = { ...settings, ...parsed.swiss };
      else settings = { ...settings, ...parsed };
    } catch (e) {}
  }

  const rounds = stage.bracketNodes.map((n) => n.round);
  const currentMaxRound = rounds.length > 0 ? Math.max(...rounds) : 0;

  let targetRound = currentMaxRound + 1;

  if (isRegenerate && currentMaxRound > 0) {
    targetRound = currentMaxRound;
    const nodesToDelete = stage.bracketNodes.filter((n) => n.round === targetRound);
    const matchIdsToDelete = nodesToDelete.map((n) => n.matchId).filter(Boolean) as string[];

    await prisma.bracketNode.deleteMany({
      where: { stageId, round: targetRound },
    });
    if (matchIdsToDelete.length > 0) {
      await prisma.match.deleteMany({
        where: { id: { in: matchIdsToDelete } },
      });
    }
  } else if (currentMaxRound > 0) {
    const currentRoundNodes = stage.bracketNodes.filter((n) => n.round === currentMaxRound);
    const unfinishedMatches = currentRoundNodes.filter(
      (n) => n.match && n.match.status !== "FINISHED" && n.match.status !== "CANCELLED"
    );
    if (unfinishedMatches.length > 0) {
      return {
        success: false,
        error: `Нельзя сгенерировать Раунд ${targetRound}, пока не завершены все матчи Раунда ${currentMaxRound}.`,
      };
    }
  }

  if (targetRound > settings.maxRounds) {
    return { success: false, error: `Достигнут лимит раундов (${settings.maxRounds}).` };
  }

  const standings = await calculateSwissStandings(stageId);
  const activeTeams = standings.filter((s) => s.status === "ACTIVE");

  if (activeTeams.length < 2) {
    await checkAndAdvanceStage(stageId);
    return { success: true, message: "Swiss stage complete. Advanced teams to Playoffs." };
  }

  let byeTeam: SwissStandingItem | null = null;
  let pairingTeams = [...activeTeams];

  if (pairingTeams.length % 2 !== 0) {
    const byeCandidateIdx = [...pairingTeams].reverse().findIndex((t) => !t.hadBye);
    if (byeCandidateIdx !== -1) {
      const realIdx = pairingTeams.length - 1 - byeCandidateIdx;
      byeTeam = pairingTeams.splice(realIdx, 1)[0];
    } else {
      byeTeam = pairingTeams.pop()!;
    }
  }

  const pairs: Array<[SwissStandingItem, SwissStandingItem]> = [];

  if (targetRound === 1) {
    pairingTeams.sort((a, b) => a.seed - b.seed);
    const half = Math.floor(pairingTeams.length / 2);
    for (let i = 0; i < half; i++) {
      pairs.push([pairingTeams[i], pairingTeams[i + half]]);
    }
  } else {
    const solvedPairs = solveSwissPairings(pairingTeams);
    pairs.push(...solvedPairs);
  }

  const createdMatches = [];
  const createdNodes = [];

  let pos = 0;
  for (const [teamA, teamB] of pairs) {
    const matchId = `swiss_${stageId}_r${targetRound}_pos${pos}_${Date.now()}`;
    const scheduledAt = new Date(Date.now() + targetRound * 3600 * 1000 + pos * 1800 * 1000);

    const matchData = {
      id: matchId,
      tournamentId: stage.tournamentId,
      stageId: stage.id,
      teamAId: teamA.teamId || teamA.participantId,
      teamBId: teamB.teamId || teamB.participantId,
      teamCustomNameA: teamA.name,
      teamCustomNameB: teamB.name,
      scoreA: 0,
      scoreB: 0,
      status: "SCHEDULED",
      scheduledAt,
      bestOf: stage.format === "BO3" ? 3 : stage.format === "BO5" ? 5 : 1,
      tier: "TIER 1",
    };

    const nodeData = {
      stageId: stage.id,
      round: targetRound,
      position: pos,
      bracketType: "SWISS",
      matchId,
    };

    createdMatches.push(matchData);
    createdNodes.push(nodeData);
    pos++;
  }

  if (byeTeam) {
    const matchId = `swiss_${stageId}_r${targetRound}_bye_${Date.now()}`;
    const teamAId = byeTeam.teamId || byeTeam.participantId;
    const matchData = {
      id: matchId,
      tournamentId: stage.tournamentId,
      stageId: stage.id,
      teamAId,
      teamBId: teamAId,
      teamCustomNameA: byeTeam.name,
      teamCustomNameB: "BYE (ТЕХ. ПОБЕДА)",
      scoreA: 13,
      scoreB: 0,
      status: "FINISHED",
      finishedAt: new Date(),
      winnerId: teamAId,
      scheduledAt: new Date(),
      bestOf: 1,
      tier: "TIER 1",
    };

    const nodeData = {
      stageId: stage.id,
      round: targetRound,
      position: pos,
      bracketType: "SWISS",
      matchId,
    };

    createdMatches.push(matchData);
    createdNodes.push(nodeData);
  }

  if (createdMatches.length > 0) {
    await prisma.match.createMany({ data: createdMatches });
    await prisma.bracketNode.createMany({ data: createdNodes });
  }

  return {
    success: true,
    round: targetRound,
    matchesCount: createdMatches.length,
    byeTeam: byeTeam?.name || null,
  };
}

/**
 * Handles automatic completion of a Swiss match and round progression.
 */
export async function handleSwissMatchCompletion(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      stage: {
        include: {
          bracketNodes: { include: { match: true } },
        },
      },
    },
  });

  if (!match || !match.stage || match.stage.type !== "SWISS") return;

  const stage = match.stage;
  const standings = await calculateSwissStandings(stage.id);

  const currentMatchNode = stage.bracketNodes.find((n) => n.matchId === matchId);
  if (!currentMatchNode) return;

  const currentRound = currentMatchNode.round;
  const currentRoundNodes = stage.bracketNodes.filter((n) => n.round === currentRound);
  const allCurrentRoundFinished = currentRoundNodes.every(
    (n) => n.match && (n.match.status === "FINISHED" || n.match.status === "CANCELLED")
  );

  if (allCurrentRoundFinished) {
    const activeTeams = standings.filter((s) => s.status === "ACTIVE");

    let settings: SwissSettings = {
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
    if (stage.settings) {
      try {
        const parsed = JSON.parse(stage.settings);
        if (parsed.swiss) settings = { ...settings, ...parsed.swiss };
        else settings = { ...settings, ...parsed };
      } catch (e) {}
    }

    if (activeTeams.length >= 2 && currentRound < settings.maxRounds) {
      console.log(`[Swiss Engine] Round ${currentRound} complete. Auto-generating Round ${currentRound + 1}...`);
      await generateSwissNextRound(stage.id, false);
    } else {
      console.log(`[Swiss Engine] Swiss Stage ${stage.name} complete! Advancing qualified teams to Playoff Bracket...`);
      await checkAndAdvanceStage(stage.id);
    }
  }
}

/**
 * Checks if a Stage (Group Stage or Swiss) is fully complete.
 * If complete, automatically qualifies top N teams and transports them to Stage N+1 (Playoffs).
 */
export async function checkAndAdvanceStage(stageId: string) {
  const stage = await prisma.stage.findUnique({
    where: { id: stageId },
    include: {
      tournament: {
        include: {
          stages: {
            orderBy: { order: "asc" },
          },
        },
      },
      groups: {
        include: {
          matches: true,
        },
      },
    },
  });

  if (!stage) return;

  if (stage.type === "SWISS") {
    const standings = await calculateSwissStandings(stage.id);
    const qualified = standings.filter((s) => s.status === "ADVANCED");

    const qualifiedParticipants =
      qualified.length > 0 ? qualified : standings.slice(0, stage.advancingCount || 8);

    const currentOrder = stage.order;
    const nextStage = stage.tournament.stages.find((s) => s.order > currentOrder);

    if (!nextStage) return;

    const nextStageParticipantIds: string[] = qualifiedParticipants
      .map((q) => q.participantId)
      .filter(Boolean);

    if (
      (nextStage.type === "SINGLE_ELIMINATION" || nextStage.type === "DOUBLE_ELIMINATION") &&
      nextStageParticipantIds.length >= 2
    ) {
      console.log(`[checkAndAdvanceStage] Generating Playoff Bracket for Stage '${nextStage.name}' from Swiss Stage with ${nextStageParticipantIds.length} teams...`);
      await generateBracketStructure(
        stage.tournamentId,
        nextStage.id,
        nextStageParticipantIds,
        nextStage.type,
        nextStage.format === "BO3" ? 3 : nextStage.format === "BO5" ? 5 : 1
      );

      await prisma.activityLog.create({
        data: {
          description: `Стадия Swiss '${stage.name}' завершена. ${qualifiedParticipants.length} квалифицировавшихся команд автоматически переведены в стадию '${nextStage.name}'.`,
        },
      });
      console.log(`[checkAndAdvanceStage] Swiss Playoff advancement complete!`);
    }
    return;
  }

  if (stage.type !== "GROUP_STAGE") return;

  // Check if all group matches are FINISHED
  let allFinished = true;
  for (const group of stage.groups) {
    if (group.matches.length === 0 || group.matches.some((m) => m.status !== "FINISHED")) {
      allFinished = false;
      break;
    }
  }

  if (!allFinished) return;

  const advancingCount = stage.advancingCount || 2;

  const standingsResults = await Promise.all(
    stage.groups.map((group) =>
      calculateGroupStandings(
        group.id,
        stage.tournament.tiebreakers,
        stage.tournament.pointsWin,
        stage.tournament.pointsLoss
      )
    )
  );

  const qualifiedParticipants: GroupStandingItem[] = [];
  for (const standings of standingsResults) {
    const topN = standings.slice(0, advancingCount);
    qualifiedParticipants.push(...topN);
  }

  const currentOrder = stage.order;
  const nextStage = stage.tournament.stages.find((s) => s.order > currentOrder);

  if (!nextStage) return;

  const nextStageParticipantIds: string[] = qualifiedParticipants
    .map((q) => q.participantId)
    .filter(Boolean);

  if (
    (nextStage.type === "SINGLE_ELIMINATION" || nextStage.type === "DOUBLE_ELIMINATION") &&
    nextStageParticipantIds.length >= 2
  ) {
    console.log(`[checkAndAdvanceStage] Generating playoff bracket for stage ${nextStage.name} with ${nextStageParticipantIds.length} teams...`);
    await generateBracketStructure(
      stage.tournamentId,
      nextStage.id,
      nextStageParticipantIds,
      nextStage.type,
      nextStage.format === "BO3" ? 3 : nextStage.format === "BO5" ? 5 : 1
    );

    await prisma.activityLog.create({
      data: {
        description: `Стадия '${stage.name}' завершена. ${qualifiedParticipants.length} команд автоматически переведены в стадию '${nextStage.name}'.`,
      },
    });
    console.log(`[checkAndAdvanceStage] Stage advancement complete!`);
  }
}
