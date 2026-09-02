const fs = require('fs');
let c = fs.readFileSync('app/api/admin/applications/[id]/route.ts', 'utf8');

const txStart = c.indexOf('const roster: any = application.roster || {};');
const txEnd = c.indexOf('await tx.teamApplication.update({');

if (txStart !== -1 && txEnd !== -1) {
  const newContent = `const roster: any = application.roster || {};
        
        const createPlayer = async (nick: string, steam: string, faceit: string, country: string, role: string, defaultRole: string, isCaptain: boolean = false) => {
          if (!nick) return;
          const baseSlug = slugify(nick, { lower: true, strict: true }) || 'player';
          const pSlug = \`\${baseSlug}-\${Date.now().toString(36)}-\${Math.floor(Math.random()*10000)}\`;
          const p = await tx.player.create({
            data: {
              nickname: nick,
              slug: pSlug,
              country: country || "RU",
              defaultRole: defaultRole,
              steamUrl: steam || null,
              faceitUrl: faceit || null,
              discordUrl: isCaptain ? application.captainDiscord : null
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

        const capNick = application.captainNickname ? application.captainNickname.toLowerCase().trim() : '';
        let isCaptainInRoster = false;

        if (roster.mainPlayers) {
            for (const m of roster.mainPlayers) {
                if (!m.nickname) continue;
                let role = "Player";
                const isCap = m.nickname.toLowerCase().trim() === capNick;
                if (isCap) {
                    role = "Owner/Player";
                    isCaptainInRoster = true;
                }
                await createPlayer(m.nickname, m.steamUrl, m.faceitUrl, m.country, role, "Rifler", isCap);
            }
        }
        
        if (roster.subs) {
            for (const s of roster.subs) {
                if (!s.nickname) continue;
                let role = "Substitute";
                const isCap = s.nickname.toLowerCase().trim() === capNick;
                if (isCap) {
                    role = "Owner/Substitute";
                    isCaptainInRoster = true;
                }
                await createPlayer(s.nickname, s.steamUrl, s.faceitUrl, s.country, role, "Substitute", isCap);
            }
        }

        if (roster.coach && roster.coach.nickname) {
            let role = "Coach";
            const isCap = roster.coach.nickname.toLowerCase().trim() === capNick;
            if (isCap) {
                role = "Owner/Coach";
                isCaptainInRoster = true;
            }
            await createPlayer(roster.coach.nickname, roster.coach.steamUrl, roster.coach.faceitUrl, roster.coach.country, role, "Coach", isCap);
        }

        if (!isCaptainInRoster && application.captainNickname) {
            await createPlayer(
                application.captainNickname, 
                application.captainSteam, 
                application.captainFaceit, 
                roster.captainCountry || "RU", 
                "Owner", 
                "Owner", 
                true
            );
        }

        `;
  
  c = c.substring(0, txStart) + newContent + c.substring(txEnd);
  fs.writeFileSync('app/api/admin/applications/[id]/route.ts', c);
  console.log('Done');
}
