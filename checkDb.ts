import { prisma } from "./lib/prisma";

async function main() {
  const teams = await prisma.team.findMany({
    include: {
      memberships: {
        include: {
          player: true,
        },
      },
    },
  });

  console.log("-----------------------------------------");
  console.log("TOTAL TEAMS FOUND IN DATABASE:", teams.length);
  for (const t of teams) {
    console.log(`- TEAM: ${t.name} (${t.tag}) [Tier: ${t.tier}, Frame: ${t.frameStyle}] Players: ${t.memberships.length}`);
    for (const m of t.memberships) {
      console.log(`    * ${m.player.nickname} (${m.role}) - ${m.status}`);
    }
  }
  console.log("-----------------------------------------");
}

main().finally(() => prisma.$disconnect());
