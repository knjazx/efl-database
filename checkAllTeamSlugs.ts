import { prisma } from "./lib/prisma";

async function checkSlugs() {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, tag: true, slug: true },
  });

  console.log("-----------------------------------------");
  console.log("TOTAL TEAMS:", teams.length);
  for (const t of teams) {
    console.log(`Team: "${t.name}" | Tag: "${t.tag}" | Slug: "${t.slug}"`);
  }
  console.log("-----------------------------------------");
}

checkSlugs().finally(() => prisma.$disconnect());
