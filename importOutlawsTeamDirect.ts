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

function generateAvatarSvg(name: string): string {
  const initial = name.substring(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <rect width="160" height="160" rx="24" fill="#141414" stroke="#222222" stroke-width="3"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#F5F5F5" font-family="Inter, sans-serif" font-weight="700" font-size="52">${initial}</text>
  </svg>`;
}

async function importAllSheetTeams() {
  console.log("Fetching latest Google Sheet CSV...");
  const sheetUrl = "https://docs.google.com/spreadsheets/d/1rb_oL6_d53nCjBtGvsIj0-VR385HMs-xBKUjp3EPPKA/export?format=csv&gid=2034144484";
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  console.log(`Processing ${lines.length - 1} spreadsheet entries...`);

  const processedTeams = new Set<string>();
  let importedTeams = 0;
  let importedPlayers = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue;

    const teamName = cleanString(cols[1]);
    const teamTag = cleanString(cols[2]);
    let logoUrl = cleanString(cols[3]);
    const captainDiscord = cleanString(cols[4]) || cleanString(cols[29]);

    if (!teamName || !teamTag) continue;

    const key = teamName.toLowerCase();
    if (processedTeams.has(key)) continue;
    processedTeams.add(key);

    if (!logoUrl.startsWith("http://") && !logoUrl.startsWith("https://")) {
      logoUrl = `/logos/${teamTag.toLowerCase()}.svg`;
    }

    // Find existing team or create new
    let team = await prisma.team.findFirst({
      where: {
        OR: [
          { name: { equals: teamName, mode: "insensitive" } },
          { tag: { equals: teamTag, mode: "insensitive" } },
        ],
      },
    });

    if (!team) {
      const slug = await generateUniqueTeamSlug(teamName);
      team = await prisma.team.create({
        data: {
          name: teamName,
          tag: teamTag.toUpperCase(),
          slug,
          logoUrl,
          tier: "T1",
        },
      });
    } else {
      await prisma.team.update({
        where: { id: team.id },
        data: {
          name: teamName,
          tag: teamTag.toUpperCase(),
          logoUrl: logoUrl || team.logoUrl,
        },
      });
    }

    importedTeams++;
    console.log(`[TEAM ${importedTeams}] ${team.name} [${team.tag}] (${team.slug})`);

    // Player slots parsing
    const p1Nick = cleanString(cols[5]);
    const p1Steam = cleanUrl(cols[6]);
    const p1Faceit = cleanUrl(cols[7]);

    const p2Nick = cleanString(cols[8]);
    const p2Steam = cleanUrl(cols[9]);
    const p2Faceit = cleanUrl(cols[10]);

    const p3Nick = cleanString(cols[11]);
    const p3Steam = cleanUrl(cols[12]);
    const p3Faceit = cleanUrl(cols[13]);

    const p4Nick = cleanString(cols[14]);
    const p4Steam = cleanUrl(cols[15]);
    const p4Faceit = cleanUrl(cols[16]);

    let p5Nick = cleanString(cols[17]);
    let p5Steam = cleanUrl(cols[18]);
    let p5Faceit = cleanUrl(cols[19]);
    // Fix if shift occurred in CSV
    if (!p5Nick && cols[17] && cols[17].startsWith("http")) {
      p5Nick = "Player 5";
      p5Steam = cleanUrl(cols[17]);
    }

    const sub1Nick = cleanString(cols[20]);
    const sub1Steam = cleanUrl(cols[21]);
    const sub1Faceit = cleanUrl(cols[22]);

    const sub2Nick = cleanString(cols[23]);
    const sub2Steam = cleanUrl(cols[24]);
    const sub2Faceit = cleanUrl(cols[25]);

    const coachNick = cleanString(cols[26]);
    const coachSteam = cleanUrl(cols[27]);
    const coachFaceit = cleanUrl(cols[28]);

    const slots = [
      { nick: p1Nick, steam: p1Steam, faceit: p1Faceit, role: "Captain", discord: captainDiscord },
      { nick: p2Nick, steam: p2Steam, faceit: p2Faceit, role: "AWPer", discord: "" },
      { nick: p3Nick, steam: p3Steam, faceit: p3Faceit, role: "RIFLER", discord: "" },
      { nick: p4Nick, steam: p4Steam, faceit: p4Faceit, role: "ENTRY", discord: "" },
      { nick: p5Nick, steam: p5Steam, faceit: p5Faceit, role: "SUPPORT", discord: "" },
      { nick: sub1Nick, steam: sub1Steam, faceit: sub1Faceit, role: "SUBSTITUTE", discord: "" },
      { nick: sub2Nick, steam: sub2Steam, faceit: sub2Faceit, role: "SUBSTITUTE", discord: "" },
      { nick: coachNick, steam: coachSteam, faceit: coachFaceit, role: "COACH", discord: "" },
    ];

    for (const slot of slots) {
      if (!slot.nick) continue;

      let player = await prisma.player.findFirst({
        where: { nickname: { equals: slot.nick, mode: "insensitive" } },
      });

      const avatarSvg = generateAvatarSvg(slot.nick);

      if (!player) {
        const pSlug = await generateUniquePlayerSlug(slot.nick);
        const avatarPath = `/avatars/${pSlug}.svg`;
        fs.writeFileSync(path.join(avatarsDir, `${pSlug}.svg`), avatarSvg);

        player = await prisma.player.create({
          data: {
            nickname: slot.nick,
            slug: pSlug,
            avatarUrl: avatarPath,
            defaultRole: slot.role,
            steamUrl: slot.steam,
            faceitUrl: slot.faceit,
            discordUrl: slot.discord,
          },
        });
      } else {
        if (!player.avatarUrl) {
          const avatarPath = `/avatars/${player.slug}.svg`;
          fs.writeFileSync(path.join(avatarsDir, `${player.slug}.svg`), avatarSvg);
          await prisma.player.update({
            where: { id: player.id },
            data: { avatarUrl: avatarPath },
          });
        }
      }

      // Check existing membership
      const membership = await prisma.teamMembership.findFirst({
        where: { teamId: team.id, playerId: player.id },
      });

      if (!membership) {
        await prisma.teamMembership.create({
          data: {
            teamId: team.id,
            playerId: player.id,
            role: slot.role,
            status: "ACTIVE",
          },
        });
      }

      importedPlayers++;
    }
  }

  console.log("=========================================");
  console.log(`SUCCESS! Synchronized ${importedTeams} teams and rosters.`);
  console.log("=========================================");
}

importAllSheetTeams()
  .catch((err) => console.error("IMPORT ERROR:", err))
  .finally(() => prisma.$disconnect());
