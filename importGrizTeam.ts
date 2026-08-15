import fs from "fs";
import path from "path";
import { prisma } from "./lib/prisma";
import { generateUniqueTeamSlug, generateUniquePlayerSlug } from "./lib/slug";

function generateAvatarSvg(name: string): string {
  const initial = name.substring(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <rect width="160" height="160" rx="24" fill="#141414" stroke="#222222" stroke-width="3"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#F5F5F5" font-family="Inter, sans-serif" font-weight="700" font-size="52">${initial}</text>
  </svg>`;
}

const grizData = {
  name: "Griz",
  tag: "GRIZ",
  logoUrl: "https://cdn.discordapp.com/attachments/1537950762414641262/1538190870560514078/94_20260815061306.png?ex=6a81c761&is=6a8075e1&hm=37d9b0be481459a03dc5d5ac69a012d24d38449ebbc1fbc4976e5c36054b1bee&",
  captainDiscord: "vladd28",
  players: [
    { nick: "kurokoqq", steam: "https://steamcommunity.com/id/kurokotetsuyaqq/", faceit: "https://www.faceit.com/ru/players/kurokoqq13", role: "Captain", discord: "vladd28" },
    { nick: "n0sTeS", steam: "https://steamcommunity.com/profiles/76561199577740828/", faceit: "https://www.faceit.com/ru/players/reqwz", role: "AWPer", discord: "" },
    { nick: "majorka", steam: "https://steamcommunity.com/profiles/76561199766661219", faceit: "https://www.faceit.com/ru/players/Majorkas9/cs2", role: "RIFLER", discord: "" },
    { nick: "deedses", steam: "https://steamcommunity.com/profiles/76561199520583142", faceit: "https://www.faceit.com/ru/players/deedses/cs2", role: "ENTRY", discord: "" },
    { nick: "Nokt", steam: "https://steamcommunity.com/profiles/76561198734807803/", faceit: "https://www.faceit.com/ru/players/n0Kd777", role: "SUPPORT", discord: "Nokt" },
  ]
};

async function main() {
  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  let team = await prisma.team.findFirst({
    where: {
      OR: [
        { name: { equals: grizData.name, mode: "insensitive" } },
        { tag: { equals: grizData.tag, mode: "insensitive" } },
      ],
    },
  });

  if (!team) {
    const slug = await generateUniqueTeamSlug(grizData.name);
    team = await prisma.team.create({
      data: {
        name: grizData.name,
        tag: grizData.tag.toUpperCase(),
        slug,
        logoUrl: grizData.logoUrl,
        tier: "TIER 3",
      },
    });
    console.log(`[CREATED TEAM] ${team.name} [${team.tag}] (${team.slug})`);
  } else {
    team = await prisma.team.update({
      where: { id: team.id },
      data: {
        name: grizData.name,
        tag: grizData.tag.toUpperCase(),
        logoUrl: grizData.logoUrl || team.logoUrl,
      },
    });
    console.log(`[UPDATED TEAM] ${team.name} [${team.tag}] (${team.slug})`);
  }

  for (const pSlot of grizData.players) {
    if (!pSlot.nick) continue;

    let player = await prisma.player.findFirst({
      where: { nickname: { equals: pSlot.nick, mode: "insensitive" } },
    });

    const avatarSvg = generateAvatarSvg(pSlot.nick);

    if (!player) {
      const pSlug = await generateUniquePlayerSlug(pSlot.nick);
      const avatarPath = `/avatars/${pSlug}.svg`;
      fs.writeFileSync(path.join(avatarsDir, `${pSlug}.svg`), avatarSvg);

      player = await prisma.player.create({
        data: {
          nickname: pSlot.nick,
          slug: pSlug,
          avatarUrl: avatarPath,
          defaultRole: pSlot.role,
          steamUrl: pSlot.steam || null,
          faceitUrl: pSlot.faceit || null,
          discordUrl: pSlot.discord || grizData.captainDiscord || null,
        },
      });
      console.log(`  └─ [CREATED PLAYER] ${player.nickname} (${player.slug})`);
    } else {
      player = await prisma.player.update({
        where: { id: player.id },
        data: {
          steamUrl: pSlot.steam || player.steamUrl,
          faceitUrl: pSlot.faceit || player.faceitUrl,
          discordUrl: pSlot.discord || player.discordUrl,
        },
      });
      console.log(`  └─ [UPDATED PLAYER] ${player.nickname} (${player.slug})`);
    }

    const membership = await prisma.teamMembership.findFirst({
      where: { teamId: team.id, playerId: player.id },
    });

    if (!membership) {
      await prisma.teamMembership.create({
        data: {
          teamId: team.id,
          playerId: player.id,
          role: pSlot.role,
          status: "ACTIVE",
        },
      });
      console.log(`  └─ [ADDED MEMBERSHIP] ${player.nickname} to ${team.name} as ${pSlot.role}`);
    }
  }

  console.log("Team Griz successfully added to database!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
