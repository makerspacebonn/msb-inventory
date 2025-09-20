import {Elysia} from "elysia";
import {db} from "../../db";
import {UserTable} from "../../drizzle/schema";

export const discordAuthRoutes = new Elysia();

discordAuthRoutes
    .get("/discord/login", ({redirect}) => {
        return redirect(process.env.DISCORD_OAUTH_URL as string)
    })
    .get("/discord/callback", async ({query: {code}, redirect}) => {
        const oauthTokens = await getOauthTokens(code);
        const user = await getDiscordUserInfo(oauthTokens);
        await saveUserInfo(user, oauthTokens);

        return redirect("/auth/discord/userinfo")
    })
    .get("/discord/userinfo", async () => {
        const user = await db.query.UserTable.findFirst()
        console.log(user)
        if (!user) {
            return "no user"
        }
        const userResponse = await fetch("https://discord.com/api/users/@me/guilds/600336147142410254/member", {
            headers: {
                "Authorization": `Bearer ${user?.accessToken}`
            }
        })

        console.log(userResponse)

        const gm = await userResponse.json()
        return gm.roles
    })


async function getOauthTokens(code : string) {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept-Encoding": "application/x-www-form-urlencoded",
        },
        method: "POST",
        body: new URLSearchParams({
            'client_id': process.env.DISCORD_CLIENT_ID as string,
            'client_secret': process.env.DISCORD_CLIENT_SECRET as string,
            'code': code,
            'grant_type': "authorization_code",
            'redirect_uri': process.env.DISCORD_REDIRECT_URI as string,
        })
    });
    return await tokenResponse.json();
}

async function getDiscordUserInfo(oauthTokens : any) {
    const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: {
            "Authorization": `Bearer ${oauthTokens.access_token}`
        }
    })
    return await userResponse.json();
}

async function saveUserInfo(user : any, oauthTokens : any) {
    try {
        const x = await db.insert(UserTable).values({
            name: user.global_name,
            discordId: user.id,
            discordName: user.username,
            accessToken: oauthTokens.access_token,
            refreshToken: oauthTokens.refresh_token
        }).onConflictDoUpdate({
            target: UserTable.discordId,
            set: {
                accessToken: oauthTokens.access_token,
                refreshToken: oauthTokens.refresh_token,
            }
        }).returning()
        console.log("insert", x)
    } catch
        (e) {
        console.log(e)
    }
}
