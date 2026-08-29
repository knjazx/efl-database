import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      teamName,
      teamTag,
      region,
      logoUrl,
      captainNickname,
      captainDiscord,
      captainTelegram,
      captainSteam,
      captainFaceit,
      captainCountry,
      mainPlayers,
      subs,
      coach
    } = data;

    if (!teamName || !teamTag || !region || !logoUrl || !captainNickname || !captainDiscord || !captainTelegram) {
      return NextResponse.json({ success: false, error: "Заполните все обязательные поля команды и владельца" }, { status: 400 });
    }

    for (let i = 0; i < 5; i++) {
        if (!mainPlayers[i].nickname) {
            return NextResponse.json({ success: false, error: `Игрок основы #${i+1} должен быть заполнен` }, { status: 400 });
        }
    }

    const roster = { captainCountry, mainPlayers, subs, coach };

    const existingTeam = await prisma.team.findFirst({
      where: {
        OR: [
          { name: { equals: teamName, mode: 'insensitive' } },
          { tag: { equals: teamTag, mode: 'insensitive' } },
        ]
      }
    });

    if (existingTeam) {
      return NextResponse.json({ success: false, error: "Команда с таким названием или тегом уже существует" }, { status: 400 });
    }

    const application = await prisma.teamApplication.create({
      data: {
        teamName,
        teamTag,
        region,
        logoUrl,
        captainNickname,
        captainDiscord,
        captainTelegram,
        captainSteam: captainSteam || null,
        captainFaceit: captainFaceit || null,
        roster
      }
    });

    return NextResponse.json({ success: true, application });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ success: false, error: "Ошибка при отправке заявки" }, { status: 500 });
  }
}
