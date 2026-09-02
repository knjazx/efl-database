import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// High Quality SVG Logos for Teams
const teamLogos: Record<string, string> = {
  NPC: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="30" fill="#0A0A0A" stroke="#222222" stroke-width="4"/>
    <path d="M50 140 V60 L100 110 L150 60 V140" fill="none" stroke="#F5F5F5" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="100" cy="140" r="10" fill="#F5F5F5"/>
  </svg>`,

  APEX: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="30" fill="#0A0A0A" stroke="#222222" stroke-width="4"/>
    <polygon points="100,45 160,150 125,150 100,100 75,150 40,150" fill="#F5F5F5"/>
    <polygon points="100,75 120,120 80,120" fill="#0A0A0A"/>
  </svg>`,

  FATUM: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="30" fill="#0A0A0A" stroke="#222222" stroke-width="4"/>
    <path d="M60 55 H140 V85 H90 V105 H130 V135 H90 V155 H60 Z" fill="#F5F5F5"/>
  </svg>`,

  WOLVES: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="30" fill="#0A0A0A" stroke="#222222" stroke-width="4"/>
    <path d="M100 40 L145 80 L125 145 L100 165 L75 145 L55 80 Z" fill="none" stroke="#F5F5F5" stroke-width="10" stroke-linejoin="round"/>
    <polygon points="85,90 100,115 115,90" fill="#F5F5F5"/>
  </svg>`,

  QTM: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="30" fill="#0A0A0A" stroke="#222222" stroke-width="4"/>
    <circle cx="100" cy="95" r="45" fill="none" stroke="#F5F5F5" stroke-width="12"/>
    <line x1="125" y1="120" x2="155" y2="155" stroke="#F5F5F5" stroke-width="14" stroke-linecap="round"/>
  </svg>`,

  VOID: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="30" fill="#0A0A0A" stroke="#222222" stroke-width="4"/>
    <circle cx="100" cy="100" r="50" fill="none" stroke="#858585" stroke-width="6" stroke-dasharray="12 8"/>
    <circle cx="100" cy="100" r="22" fill="#F5F5F5"/>
  </svg>`
};

// Player Avatars SVG
function generateAvatarSvg(name: string, bg: string = "#141414"): string {
  const initial = name.substring(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <rect width="160" height="160" rx="24" fill="${bg}" stroke="#222222" stroke-width="3"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#F5F5F5" font-family="Inter, sans-serif" font-weight="700" font-size="52">${initial}</text>
  </svg>`;
}

async function main() {
  console.log("Seeding ASCENT Database...");

  const logosDir = path.join(process.cwd(), "public", "logos");
  const avatarsDir = path.join(process.cwd(), "public", "avatars");

  if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

  // Save SVG logo files
  for (const [tag, svg] of Object.entries(teamLogos)) {
    fs.writeFileSync(path.join(logosDir, `${tag.toLowerCase()}.svg`), svg);
  }

  // 1. Create/Upsert Teams
  const teamsData = [
    {
      name: "NPC",
      tag: "NPC",
      slug: "npc",
      tier: "T1",
      logoUrl: "/logos/npc.svg",
      frameStyle: "GOLD",
      description: "Premier Counter-Strike 2 squad competing at the top tier of Ascent League.",
    },
    {
      name: "Apex Predators",
      tag: "APEX",
      slug: "apex-predators",
      tier: "T1",
      logoUrl: "/logos/apex.svg",
      frameStyle: "SILVER",
      description: "Dominant European tactical lineup known for hyper-aggressive opening duels.",
    },
    {
      name: "Fatum Esports",
      tag: "FATUM",
      slug: "fatum-esports",
      tier: "T2",
      logoUrl: "/logos/fatum.svg",
      frameStyle: "COPPER",
      description: "Rising force in the ASCENT T2 circuit featuring top CIS talents.",
    },
    {
      name: "Cyber Wolves",
      tag: "WOLVES",
      slug: "cyber-wolves",
      tier: "T1",
      logoUrl: "/logos/wolves.svg",
      frameStyle: "NEON",
      description: "Strategic powerhouse with disciplined tactical play execution.",
    },
    {
      name: "Quantum Gaming",
      tag: "QTM",
      slug: "quantum-gaming",
      tier: "T2",
      logoUrl: "/logos/qtm.svg",
      frameStyle: "CRIMSON",
      description: "Fast-paced firepower lineup pushing the bounds of modern CS2 tactics.",
    },
    {
      name: "Astral Void",
      tag: "VOID",
      slug: "astral-void",
      tier: "T3",
      logoUrl: "/logos/void.svg",
      frameStyle: "NONE",
      description: "Promising academy division honing the next generation of esports pros.",
    },
  ];

  const createdTeams: Record<string, any> = {};

  for (const t of teamsData) {
    const team = await prisma.team.upsert({
      where: { slug: t.slug },
      update: { frameStyle: t.frameStyle },
      create: t,
    });
    createdTeams[t.tag] = team;
  }

  // 2. Players & Memberships Data
  const playersData = [
    // NPC Roster
    { nickname: "KnjazX", slug: "knjazx", role: "CAPTAIN", teamTag: "NPC", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "s1mple_fan", slug: "s1mple-fan", role: "AWPer", teamTag: "NPC", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "CyberBlade", slug: "cyberblade", role: "RIFLER", teamTag: "NPC", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Phantom9", slug: "phantom9", role: "ENTRY", teamTag: "NPC", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Vortex_CS", slug: "vortex-cs", role: "SUPPORT", teamTag: "NPC", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    // NPC Former
    { nickname: "Legacy_Player", slug: "legacy-player", role: "RIFLER", teamTag: "NPC", former: true, leftAt: new Date("2026-08-04T12:00:00Z"), steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },

    // APEX Roster
    { nickname: "ApexGod", slug: "apexgod", role: "CAPTAIN", teamTag: "APEX", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "SniperX", slug: "sniperx", role: "AWPer", teamTag: "APEX", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Kevlar", slug: "kevlar", role: "RIFLER", teamTag: "APEX", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Matrix", slug: "matrix", role: "ENTRY", teamTag: "APEX", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "NukePro", slug: "nukepro", role: "IGL", teamTag: "APEX", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },

    // FATUM Roster
    { nickname: "FateMaster", slug: "fatemaster", role: "CAPTAIN", teamTag: "FATUM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "GhostRider", slug: "ghostrider", role: "AWPer", teamTag: "FATUM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Shadow", slug: "shadow", role: "RIFLER", teamTag: "FATUM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "MirageDemon", slug: "miragedemon", role: "ENTRY", teamTag: "FATUM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Zenith", slug: "zenith", role: "SUPPORT", teamTag: "FATUM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    // FATUM Former
    { nickname: "OldGuard", slug: "oldguard", role: "COACH", teamTag: "FATUM", former: true, leftAt: new Date("2026-08-03T18:30:00Z"), steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },

    // WOLVES Roster
    { nickname: "AlphaWolf", slug: "alphawolf", role: "CAPTAIN", teamTag: "WOLVES", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "PackLead", slug: "packlead", role: "IGL", teamTag: "WOLVES", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "BiteForce", slug: "biteforce", role: "AWPer", teamTag: "WOLVES", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "NightStalker", slug: "nightstalker", role: "RIFLER", teamTag: "WOLVES", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Luna", slug: "luna", role: "ENTRY", teamTag: "WOLVES", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },

    // QTM Roster
    { nickname: "Photon", slug: "photon", role: "CAPTAIN", teamTag: "QTM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Quark", slug: "quark", role: "AWPer", teamTag: "QTM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Electron", slug: "electron", role: "RIFLER", teamTag: "QTM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Hadron", slug: "hadron", role: "ENTRY", teamTag: "QTM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Lepton", slug: "lepton", role: "SUPPORT", teamTag: "QTM", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },

    // VOID Roster
    { nickname: "Singularity", slug: "singularity", role: "CAPTAIN", teamTag: "VOID", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Eclipse", slug: "eclipse", role: "AWPer", teamTag: "VOID", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Nebula", slug: "nebula", role: "RIFLER", teamTag: "VOID", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Pulsar", slug: "pulsar", role: "ENTRY", teamTag: "VOID", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
    { nickname: "Cosmo", slug: "cosmo", role: "SUPPORT", teamTag: "VOID", steam: "https://steamcommunity.com", faceit: "https://www.faceit.com" },
  ];

  for (const p of playersData) {
    const player = await prisma.player.upsert({
      where: { slug: p.slug },
      update: {
        defaultRole: p.role,
      },
      create: {
        nickname: p.nickname,
        slug: p.slug,
        defaultRole: p.role,
        steamUrl: p.steam,
        faceitUrl: p.faceit,
      },
    });

    const targetTeam = createdTeams[p.teamTag];
    if (targetTeam) {
      const existingMem = await prisma.teamMembership.findFirst({
        where: { teamId: targetTeam.id, playerId: player.id },
      });

      if (!existingMem) {
        await prisma.teamMembership.create({
          data: {
            teamId: targetTeam.id,
            playerId: player.id,
            role: p.role,
            status: p.former ? "FORMER" : "ACTIVE",
            leftAt: p.leftAt || null,
          },
        });
      }
    }
  }

  // 3. Activity Logs
  const activityLogs = [
    { teamId: createdTeams["NPC"].id, teamName: "NPC", description: "Roster update: Legacy_Player moved to Former Players", timestamp: new Date("2026-08-04T12:00:00Z") },
    { teamId: createdTeams["FATUM"].id, teamName: "Fatum Esports", description: "Logo updated", timestamp: new Date("2026-08-03T18:30:00Z") },
    { teamId: createdTeams["APEX"].id, teamName: "Apex Predators", description: "Team Tier updated to T1", timestamp: new Date("2026-08-02T14:15:00Z") },
  ];

  for (const log of activityLogs) {
    await prisma.activityLog.create({
      data: log,
    });
  }

  console.log("ASCENT Database successfully seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
