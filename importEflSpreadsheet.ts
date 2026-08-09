import fs from "fs";
import path from "path";
import { prisma } from "./lib/prisma";
import { generateUniqueTeamSlug, generateUniquePlayerSlug } from "./lib/slug";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function cleanString(val?: string): string {
  if (!val) return "";
  let clean = val.replace(/^["']|["']$/g, "").trim();
  if (
    ["нет", "нету", "-", "--", "---", "0", "dont have", "no faceit", "нету", "нет замены"].includes(
      clean.toLowerCase()
    )
  ) {
    return "";
  }
  return clean;
}

function cleanUrl(val?: string): string {
  const str = cleanString(val);
  if (!str) return "";
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }
  return "";
}

async function runImport() {
  console.log("Starting EFL Google Sheet CSV Import...");

  const csvPath = "C:/Users/knjazx/.gemini/antigravity/brain/1ed8d5eb-b7fb-48f2-80fc-1b03f521d4c9/.system_generated/steps/371/content.md";

  let rawContent = "";
  if (fs.existsSync(csvPath)) {
    rawContent = fs.readFileSync(csvPath, "utf-8");
  } else {
    console.error("CSV file not found at path:", csvPath);
    return;
  }

  const lines = rawContent.split("\n");
  const dataLines = lines.slice(9).filter((l) => l.trim().length > 0);

  console.log(`Found ${dataLines.length} registration entries in spreadsheet.`);

  // Clear existing memberships & activity logs to prevent duplicate team members
  await prisma.teamMembership.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.team.deleteMany({});

  const processedTeams = new Set<string>();
  let importedTeamsCount = 0;
  let importedPlayersCount = 0;

  for (const lineStr of dataLines) {
    const cols = parseCsvLine(lineStr);
    if (cols.length < 5) continue;

    const teamName = cleanString(cols[1]);
    const teamTag = cleanString(cols[2]);
    let logoUrl = cleanString(cols[3]);
    const captainDiscord = cleanString(cols[4]) || cleanString(cols[29]);

    if (!teamName || !teamTag) continue;

    const teamKey = teamName.toLowerCase();
    if (processedTeams.has(teamKey)) {
      console.log(`Skipping duplicate team entry: "${teamName}"`);
      continue;
    }
    processedTeams.add(teamKey);

    // Normalize logo URL
    if (!logoUrl.startsWith("http://") && !logoUrl.startsWith("https://")) {
      logoUrl = `/logos/${teamTag.toLowerCase()}.svg`;
    }

    const teamSlug = await generateUniqueTeamSlug(teamName);

    // Create Team
    const team = await prisma.team.create({
      data: {
        name: teamName,
        tag: teamTag.toUpperCase(),
        slug: teamSlug,
        tier: "T1",
        logoUrl: logoUrl,
        frameStyle: "NONE",
        description: `EFL Tournament Team (${teamTag.toUpperCase()})`,
      },
    });

    importedTeamsCount++;

    // Define player columns slots: [NickCol, SteamCol, FaceitCol, DefaultRole]
    const playerSlots = [
      { nick: 5, steam: 6, faceit: 7, role: "CAPTAIN" },
      { nick: 8, steam: 9, faceit: 10, role: "AWPer" },
      { nick: 11, steam: 12, faceit: 13, role: "RIFLER" },
      { nick: 14, steam: 15, faceit: 16, role: "ENTRY" },
      { nick: 17, steam: 18, faceit: 19, role: "SUPPORT" },
      { nick: 20, steam: 21, faceit: 22, role: "SUBSTITUTE" },
      { nick: 23, steam: 24, faceit: 25, role: "SUBSTITUTE" },
      { nick: 26, steam: 27, faceit: 28, role: "COACH" },
    ];

    for (const slot of playerSlots) {
      const pNick = cleanString(cols[slot.nick]);
      if (!pNick) continue;

      const pSteam = cleanUrl(cols[slot.steam]);
      const pFaceit = cleanUrl(cols[slot.faceit]);
      const playerSlug = await generateUniquePlayerSlug(pNick);

      const player = await prisma.player.create({
        data: {
          nickname: pNick,
          slug: playerSlug,
          defaultRole: slot.role,
          steamUrl: pSteam,
          faceitUrl: pFaceit,
          discordUrl: slot.role === "CAPTAIN" ? captainDiscord : undefined,
        },
      });

      await prisma.teamMembership.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          role: slot.role,
          status: "ACTIVE",
        },
      });

      importedPlayersCount++;
    }

    console.log(`+ Imported Team: "${teamName}" (${teamTag}) with roster.`);
  }

  console.log("=========================================");
  console.log(`SUCCESSFULLY IMPORTED ${importedTeamsCount} TEAMS AND ${importedPlayersCount} PLAYERS!`);
  console.log("=========================================");
}

runImport()
  .catch((e) => console.error("Import error:", e))
  .finally(() => prisma.$disconnect());
