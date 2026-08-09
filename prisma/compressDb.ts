import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB image payload compression cleanup...");

  const teams = await prisma.team.findMany();
  let teamCount = 0;
  for (const team of teams) {
    if (team.logoUrl && team.logoUrl.length > 100000) {
      console.log(`Truncating oversized team logo string for ${team.name} (length: ${team.logoUrl.length})...`);
      // Truncate/replace oversized base64 to fallback default svg if uncompressed
      await prisma.team.update({
        where: { id: team.id },
        data: { logoUrl: `/logos/${team.tag.toLowerCase()}.svg` },
      });
      teamCount++;
    }
  }

  console.log(`Cleanup complete! Reset ${teamCount} oversized team logos.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
