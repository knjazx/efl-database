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

const teamsData = [
  {
    name: "Fox Team",
    tag: "FOX",
    logoUrl: "https://cdn.discordapp.com/attachments/1497248919271374901/1535668005470470224/7B0687ED-32AE-4EA9-930B-8A5D6992D3C3.png?ex=6a7899c7&is=6a774847&hm=b15f68609650b1b98fa54c6b606d27b041f32cc503d59287ccc9e1a0249b1bdf",
    captainDiscord: "slavapro2802.",
    players: [
      { nick: "PROKSI", steam: "https://steamcommunity.com/profiles/76561199043336648/", faceit: "https://www.faceit.com/ru/players/PROKSI130803", role: "Captain", discord: "pro1si" },
      { nick: "RICH", steam: "https://steamcommunity.com/profiles/76561199844994822/", faceit: "https://www.faceit.com/uk/players/R1Ch33", role: "AWPer", discord: "" },
      { nick: "T1s", steam: "https://steamcommunity.com/profiles/76561199829905054", faceit: "https://www.faceit.com/ru/players/d4rkkkkkkkkk", role: "RIFLER", discord: "" },
      { nick: "air", steam: "https://steamcommunity.com/profiles/76561198758792200/", faceit: "https://www.faceit.com/ru/players/dragonrr1", role: "ENTRY", discord: "" },
      { nick: "malayoon", steam: "https://steamcommunity.com/profiles/76561199528092605", faceit: "https://www.faceit.com/ru/players/makayon", role: "SUPPORT", discord: "" },
    ]
  },
  {
    name: "Freak Room",
    tag: "FR",
    logoUrl: "https://ibb.co/5gv4bGcq",
    captainDiscord: "@amticxp",
    players: [
      { nick: "homosap1ens", steam: "https://steamcommunity.com/profiles/76561199067586741/", faceit: "https://www.faceit.com/ru/players/Amtich", role: "Captain", discord: "@amticxp" },
      { nick: "Жужа", steam: "https://steamcommunity.com/id/Dipcur", faceit: "https://www.faceit.com/ru/players/Dipcur", role: "AWPer", discord: "" },
      { nick: "qxo1e", steam: "https://steamcommunity.com/profiles/76561199801772193", faceit: "https://www.faceit.com/ru/players/qxo1e", role: "RIFLER", discord: "" },
      { nick: "Lonelyy", steam: "https://steamcommunity.com/profiles/76561198756942623", faceit: "", role: "ENTRY", discord: "" },
      { nick: "xxnoobasterxx", steam: "https://steamcommunity.com/profiles/76561199767860526", faceit: "", role: "SUPPORT", discord: "" },
    ]
  },
  {
    name: "MOON TEAM",
    tag: "MOON",
    logoUrl: "https://ibb.co/yczV3NSC",
    captainDiscord: "@stylert",
    players: [
      { nick: "hltvs666", steam: "https://steamcommunity.com/profiles/76561199404606591/", faceit: "https://www.faceit.com/ru/players/hltvs666", role: "Captain", discord: "@stylert" },
      { nick: "fleke666", steam: "https://steamcommunity.com/profiles/76561199852179094/", faceit: "https://www.faceit.com/ru/players/fleke666", role: "AWPer", discord: "" },
      { nick: "hesirn666", steam: "https://steamcommunity.com/id/precached/", faceit: "https://www.faceit.com/ru/players/hesirn666", role: "RIFLER", discord: "" },
      { nick: "CANEK_KAMAZ", steam: "https://steamcommunity.com/profiles/76561199850052967", faceit: "https://www.faceit.com/ru/players/CANEK_KAMAZ", role: "ENTRY", discord: "" },
      { nick: "topi", steam: "https://steamcommunity.com/profiles/76561198778826452", faceit: "https://www.faceit.com/ru/players/HANs1ne", role: "SUPPORT", discord: "" },
      { nick: "hlt", steam: "https://steamcommunity.com/profiles/76561198383237401", faceit: "https://www.faceit.com/ru/players/hlt", role: "SUBSTITUTE", discord: "" },
      { nick: "exetiksss777", steam: "https://steamcommunity.com/profiles/76561199879042492", faceit: "https://www.faceit.com/ru/players/exetiksss777", role: "SUBSTITUTE", discord: "" },
    ]
  }
];

async function main() {
  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  for (const tData of teamsData) {
    let team = await prisma.team.findFirst({
      where: {
        OR: [
          { name: { equals: tData.name, mode: "insensitive" } },
          { tag: { equals: tData.tag, mode: "insensitive" } },
        ],
      },
    });

    if (!team) {
      const slug = await generateUniqueTeamSlug(tData.name);
      team = await prisma.team.create({
        data: {
          name: tData.name,
          tag: tData.tag.toUpperCase(),
          slug,
          logoUrl: tData.logoUrl,
          tier: "TIER 3",
        },
      });
      console.log(`[CREATED TEAM] ${team.name} [${team.tag}] (${team.slug})`);
    } else {
      await prisma.team.update({
        where: { id: team.id },
        data: {
          name: tData.name,
          tag: tData.tag.toUpperCase(),
          logoUrl: tData.logoUrl || team.logoUrl,
        },
      });
      console.log(`[UPDATED TEAM] ${team.name} [${team.tag}] (${team.slug})`);
    }

    for (const pSlot of tData.players) {
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
            discordUrl: pSlot.discord || tData.captainDiscord || null,
          },
        });
        console.log(`  └─ [CREATED PLAYER] ${player.nickname} (${player.slug})`);
      } else {
        await prisma.player.update({
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
      }
    }
  }

  console.log("Done importing teams!");
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
