import { prisma } from "@/lib/prisma";

const cyrillicToLatinMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => cyrillicToLatinMap[char] || char)
    .join("");
}

export async function generateUniquePlayerSlug(nickname: string, excludePlayerId?: string): Promise<string> {
  const latinText = transliterate(nickname);
  let baseSlug = latinText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (!baseSlug || baseSlug.length === 0) {
    baseSlug = "player";
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.player.findFirst({
      where: {
        slug,
        ...(excludePlayerId ? { NOT: { id: excludePlayerId } } : {}),
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function generateUniqueTeamSlug(name: string, excludeTeamId?: string): Promise<string> {
  const latinText = transliterate(name);
  let baseSlug = latinText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (!baseSlug || baseSlug.length === 0) {
    baseSlug = "team";
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.team.findFirst({
      where: {
        slug,
        ...(excludeTeamId ? { NOT: { id: excludeTeamId } } : {}),
      },
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
