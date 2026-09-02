import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { action } = await req.json();
    const id = params.id;

    const application = await prisma.teamApplication.findUnique({
      where: { id }
    });

    if (!application) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (action === "REJECT") {
      await prisma.teamApplication.update({
        where: { id },
        data: { status: "REJECTED" }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "APPROVE") {
      if (application.status === "APPROVED") {
        return NextResponse.json({ success: false, error: "Already approved" }, { status: 400 });
      }

      const baseTeamSlug = slugify(application.teamName, { lower: true, strict: true }) || 'team';
      const teamSlug = `${baseTeamSlug}-${Date.now().toString(36)}`;
      
      await prisma.$transaction(async (tx) => {
        const team = await tx.team.create({
          data: {
            name: application.teamName,
            tag: application.teamTag,
            slug: teamSlug,
            region: application.region,
            contactDiscord: application.captainDiscord,
            contactTelegram: application.captainTelegram,
            logoUrl: application.logoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/84/CS2_logo.png",
          }
        });

        const roster: any = application.roster || {};
        
        const createPlayer = async (nick: string, steam: string, faceit: string, country: string, role: string, defaultRole: string) => {
          if (!nick) return;
          const baseSlug = slugify(nick, { lower: true, strict: true }) || 'player';
          const pSlug = `${baseSlug}-${Date.now().toString(36)}-${Math.floor(Math.random()*10000)}`;
          const p = await tx.player.create({
            data: {
              nickname: nick,
              slug: pSlug,
              country: country || "RU",
              defaultRole: defaultRole,
              steamUrl: steam || null,
              faceitUrl: faceit || null,
            }
          });
          await tx.teamMembership.create({
            data: {
              teamId: team.id,
              playerId: p.id,
              role: role,
              status: "ACTIVE"
            }
          });
        };

        // Captain is no longer added as a player
        if (roster.mainPlayers) {
            for (const m of roster.mainPlayers) {
                await createPlayer(m.nickname, m.steamUrl, m.faceitUrl, m.country, "Player", "Rifler");
            }
        }
        
        if (roster.subs) {
            for (const s of roster.subs) {
                await createPlayer(s.nickname, s.steamUrl, s.faceitUrl, s.country, "Substitute", "Substitute");
            }
        }

        if (roster.coach && roster.coach.nickname) {
            await createPlayer(roster.coach.nickname, roster.coach.steamUrl, roster.coach.faceitUrl, roster.coach.country, "Coach", "Coach");
        }

        await tx.teamApplication.update({
          where: { id },
          data: { status: "APPROVED" }
        });
        
        await tx.activityLog.create({
          data: {
            teamId: team.id,
            teamName: team.name,
            description: `Команда ${team.name} была официально зарегистрирована в EFL.`,
          }
        });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json({ success: false, error: "Failed to process" }, { status: 500 });
  }
}
