# Authentik → better-auth: Rollen & Benutzerbilder übertragen

> Diese Dokumentation beschreibt, wie Rollen (Groups) und Benutzerbilder (Avatars) von Authentik an eine better-auth Installation übergeben werden.

**Stand:** 2026-01-17

---

## Übersicht

Authentik sendet Benutzerdaten über OIDC Claims. Diese Claims können in better-auth mit der `mapProfileToUser` Funktion verarbeitet werden.

| Daten | Authentik-Quelle | OIDC Claim | better-auth Verarbeitung |
|-------|------------------|------------|--------------------------|
| Rollen/Gruppen | `user.ak_groups.all()` | `groups` (custom) | `mapProfileToUser` |
| Profilbild | `user.attributes.avatar` | `picture` (standard) | `mapProfileToUser` |

---

## Teil 1: Gruppen/Rollen übertragen

### 1.1 Authentik: Scope Mapping erstellen

**Schritt 1:** Navigiere zu **Customization → Property Mappings → Create → Scope Mapping**

**Schritt 2:** Konfiguriere das Mapping:

| Feld | Wert |
|------|------|
| Name | `groups` |
| Scope name | `groups` |
| Description | `User groups for RBAC` |

**Schritt 3:** Python Expression eingeben:

```python
# Einfache Variante: Alle Gruppennamen
return {
    "groups": [group.name for group in user.ak_groups.all()]
}
```

**Erweiterte Variante mit Admin-Flag:**

```python
groups = [group.name for group in user.ak_groups.all()]

# Authentik Superuser automatisch als Admin kennzeichnen
if user.is_superuser and "admin" not in groups:
    groups.append("admin")

return {"groups": groups}
```

**Variante mit Group-Attributen** (für feingranulare Kontrolle):

```python
# Nur Gruppen mit spezifischem Attribut
return {
    "app_roles": [
        str(g.attributes.get('msb_role', g.name))
        for g in user.ak_groups.all()
        if 'msb_role' in g.attributes or g.name.startswith('msb-')
    ]
}
```

### 1.2 Authentik: Scope Mapping dem Provider zuweisen

1. Navigiere zu **Applications → Providers → [Dein OAuth2 Provider]**
2. Bearbeite den Provider
3. Unter **Advanced protocol settings**:
   - Füge das `groups` Scope Mapping zu **Scopes** hinzu
4. Aktiviere **"Include claims in id_token"** für schnelleren Zugriff
5. Speichern

### 1.3 better-auth: Scopes anfordern und Claims verarbeiten

**Angepasste auth.ts Konfiguration:**

```typescript
import { betterAuth } from "better-auth"
import { admin, genericOAuth } from "better-auth/plugins"

// Typ für Authentik Profile mit Groups
interface AuthentikProfile {
  sub: string
  name?: string
  preferred_username?: string
  email?: string
  picture?: string
  groups?: string[]  // Custom claim
}

export const auth = betterAuth({
  // ... database config ...
  plugins: [
    admin(),
    genericOAuth({
      config: [
        {
          providerId: "authentik",
          clientId: process.env.AUTHENTIK_CLIENT_ID!,
          clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
          discoveryUrl: `${process.env.AUTHENTIK_URL}/application/o/${process.env.AUTHENTIK_APP_SLUG}/.well-known/openid-configuration`,

          // WICHTIG: groups scope anfordern
          scopes: ["openid", "profile", "email", "groups"],

          mapProfileToUser: (profile: AuthentikProfile) => {
            // Rolle basierend auf Gruppen bestimmen
            const role = mapAuthentikGroupsToRole(profile.groups || [])

            return {
              name: profile.name || profile.preferred_username,
              email: profile.email || `${profile.sub}@authentik.local`,
              image: profile.picture,
              role: role,  // Erfordert role-Feld im User-Schema
            }
          },

          // Bei jedem Login User-Daten aktualisieren
          overrideUserInfo: true,
        },
      ],
    }),
  ],
})

// Hilfsfunktion für Rollen-Mapping
type AppRole = "user" | "editor" | "admin"

const adminGroups = (process.env.AUTHENTIK_ADMIN_GROUPS || "admins,makerspace-admins").split(",")
const editorGroups = (process.env.AUTHENTIK_EDITOR_GROUPS || "editors,makerspace-editors").split(",")

function mapAuthentikGroupsToRole(groups: string[]): AppRole {
  if (groups.some(g => adminGroups.includes(g))) return "admin"
  if (groups.some(g => editorGroups.includes(g))) return "editor"
  return "user"
}
```

### 1.4 Bekannte Einschränkungen

> **Wichtig:** Es gibt bekannte Issues mit der Rollen-Synchronisation in better-auth ([Issue #5772](https://github.com/better-auth/better-auth/issues/5772)):

1. **Session-Cache Problem:** Mit aktiviertem `session.cookieCache` kann es sein, dass Rollen-Änderungen erst nach zweimaligem Login wirksam werden.

2. **Workaround:** Entweder Cache deaktivieren oder Benutzer informieren, dass sie sich erneut einloggen müssen:

```typescript
session: {
  cookieCache: {
    enabled: false,  // Deaktiviert für sofortige Rollen-Updates
  },
},
```

---

## Teil 2: Benutzerbilder (Avatars) übertragen

### 2.1 Standard-Verhalten

Authentik unterstützt `picture` im Standard OIDC `profile` Scope. Wenn ein Avatar konfiguriert ist, wird er automatisch übertragen.

**Aktuelle auth.ts nutzt dies bereits:**

```typescript
mapProfileToUser: (profile) => ({
  name: profile.name || profile.preferred_username,
  email: profile.email || `${profile.sub}@authentik.local`,
  image: profile.picture,  // ← Authentik picture claim
}),
```

### 2.2 Authentik: Avatar-Support aktivieren

**Option A: Gravatar (Standard)**

Authentik nutzt standardmäßig Gravatar basierend auf der E-Mail-Adresse.

**Option B: Custom Avatars via User-Attribute**

1. **Systemeinstellungen anpassen:**

   Setze `AUTHENTIK_AVATARS` Environment Variable:
   ```bash
   AUTHENTIK_AVATARS=attributes.avatar,gravatar,initials
   ```

   Dies priorisiert:
   1. Custom Avatar aus Benutzer-Attribut
   2. Gravatar
   3. Initialen

2. **Avatar-URL im Attribut speichern:**

   Benutzer können einen Avatar-URL in ihrem Profil speichern:
   - Navigiere zu **Directory → Users → [User] → Attributes**
   - Füge hinzu: `avatar: "https://example.com/avatar.jpg"`

### 2.3 Custom Property Mapping für Avatar (Optional)

Falls du mehr Kontrolle über den `picture` Claim benötigst:

**Neues Scope Mapping erstellen:**

| Feld | Wert |
|------|------|
| Name | `profile_with_avatar` |
| Scope name | `profile` |

**Expression:**

```python
avatar_url = user.attributes.get("avatar")

# Fallback zu Gravatar wenn kein Custom Avatar
if not avatar_url:
    import hashlib
    email_hash = hashlib.md5(user.email.lower().encode()).hexdigest()
    avatar_url = f"https://www.gravatar.com/avatar/{email_hash}?d=identicon"

return {
    "name": user.name,
    "preferred_username": user.username,
    "picture": avatar_url,
}
```

### 2.4 Bekannte Einschränkungen bei Avatars

- **Base64-Avatare:** Wenn Authentik Base64-kodierte Avatare in Attributen speichert (statt URLs), werden die Tokens sehr groß (~1MB). Besser URLs verwenden.
- **Token-Authentifizierung:** Seit Authentik 2025.12 benötigen `/media/` URLs manchmal einen Token-Parameter ([GitHub Issue #6824](https://github.com/goauthentik/authentik/discussions/6824)).

---

## Teil 3: Vollständiges Beispiel

### 3.1 Environment Variables

```bash
# .env
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_CLIENT_SECRET=your-client-secret
AUTHENTIK_URL=https://auth.example.com
AUTHENTIK_APP_SLUG=msb-inventory

# Rollen-Mapping
AUTHENTIK_ADMIN_GROUPS=makerspace-admins,inventory-admins
AUTHENTIK_EDITOR_GROUPS=makerspace-editors,inventory-editors
```

### 3.2 Komplette auth.ts

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, genericOAuth } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { db } from "@/src/db"
import * as schema from "@/src/drizzle/schema"

// Authentik Profile Type
interface AuthentikProfile {
  sub: string
  name?: string
  preferred_username?: string
  email?: string
  picture?: string
  groups?: string[]
}

// Role Mapping
type AppRole = "user" | "editor" | "admin"

const adminGroups = (process.env.AUTHENTIK_ADMIN_GROUPS || "").split(",").filter(Boolean)
const editorGroups = (process.env.AUTHENTIK_EDITOR_GROUPS || "").split(",").filter(Boolean)

function mapAuthentikGroupsToRole(groups: string[]): AppRole {
  if (groups.some(g => adminGroups.includes(g))) return "admin"
  if (groups.some(g => editorGroups.includes(g))) return "editor"
  return "user"
}

// Check if Authentik is configured
export const authentikConfigured = !!(
  process.env.AUTHENTIK_CLIENT_ID &&
  process.env.AUTHENTIK_CLIENT_SECRET &&
  process.env.AUTHENTIK_URL
)

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.UserTable,
      session: schema.SessionTable,
      account: schema.AccountTable,
      verification: schema.VerificationTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    admin(),
    ...(authentikConfigured
      ? [
          genericOAuth({
            config: [
              {
                providerId: "authentik",
                clientId: process.env.AUTHENTIK_CLIENT_ID!,
                clientSecret: process.env.AUTHENTIK_CLIENT_SECRET!,
                discoveryUrl: `${process.env.AUTHENTIK_URL}/application/o/${process.env.AUTHENTIK_APP_SLUG || "msb-inventory"}/.well-known/openid-configuration`,
                scopes: ["openid", "profile", "email", "groups"],
                mapProfileToUser: (profile: AuthentikProfile) => ({
                  name: profile.name || profile.preferred_username,
                  email: profile.email || `${profile.sub}@authentik.local`,
                  image: profile.picture,
                  role: mapAuthentikGroupsToRole(profile.groups || []),
                }),
                overrideUserInfo: true,
              },
            ],
          }),
        ]
      : []),
    tanstackStartCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
```




import base64
from authentik.core.models import Group

ACCEPTED_GUILD_ID = "600336147142410254"
AVATAR_SIZE = "64"

# Discord Guild-Daten holen
discord_roles = set()
try:
guild_url = f"https://discord.com/api/v10/users/@me/guilds/{ACCEPTED_GUILD_ID}/member"
guild_response = client.do_request("GET", guild_url, token=token)
if guild_response.status_code == 200:
guild_data = guild_response.json()
discord_roles = set(guild_data.get("roles", []))
except Exception as e:
ak_logger.warning(f"Discord API error: {e}")

# Gruppen matchen (unterstützt einzelne IDs und Listen)
user_groups = []
if discord_roles:
for group in Group.objects.filter(attributes__has_key="discord_role_id"):
role_ids = group.attributes.get("discord_role_id", [])

        # String → Liste normalisieren
        if isinstance(role_ids, str):
            role_ids = [role_ids]
        
        # Match prüfen
        if discord_roles.intersection(role_ids):
            user_groups.append(group)

# Avatar (optional)
avatar_base64 = None
avatar_url = None
if info.get("avatar"):
avatar_url = (
f"https://cdn.discordapp.com/avatars/{info.get('id')}/"
f"{info.get('avatar')}.png?size={AVATAR_SIZE}"
)
try:
response = client.do_request("GET", avatar_url)
if response.status_code == 200:
encoded = base64.b64encode(response.content).decode('utf-8')
avatar_base64 = f"data:image/png;base64,{encoded}"
except:
pass

return {
"name": info.get("global_name"),
"attributes.discord": {
"id": info.get("id"),
"username": info.get("global_name"),
"discriminator": info.get("discriminator"),
"email": info.get("email"),
"avatar": info.get("avatar"),
"avatar_url": avatar_url,
"roles": list(discord_roles),  # Für Debugging
},
"groups": [group.name for group in user_groups],
"attributes.avatar": avatar_base64,
}






return {
"attributes": {
"username": info.get("username"),
"email": info.get("email"),
"groups": [group.name for group in user_groups],
"name": info.get("global_name"),
"discord": {
"testfield": "some test",
"id": info.get("id"),
"username": info.get("global_name"),
"discriminator": info.get("discriminator"),
"avatar": info.get("avatar"),
"avatar_url": avatar_url,
"roles": list(discord_roles),
},
#"avatar": avatar_base64,
}
}






### 3.3 Authentik Konfiguration Checkliste

**Für Gruppen/Rollen:**

- [ ] Scope Mapping `groups` erstellen mit `user.ak_groups.all()`
- [ ] Scope Mapping dem OAuth2 Provider zuweisen
- [ ] "Include claims in id_token" aktivieren
- [ ] Gruppen in Authentik erstellen (z.B. `makerspace-admins`)
- [ ] Benutzer den Gruppen zuweisen
- [ ] Environment Variables setzen (`AUTHENTIK_ADMIN_GROUPS`, etc.)

**Für Avatare:**

- [ ] `AUTHENTIK_AVATARS` konfigurieren (optional)
- [ ] Avatar-URLs in Benutzer-Attributen speichern (optional)
- [ ] Custom Property Mapping erstellen (optional)

---

## Quellen

- [better-auth Generic OAuth Dokumentation](https://www.better-auth.com/docs/plugins/generic-oauth)
- [better-auth Issue #5772 - Custom IDP claims for roles](https://github.com/better-auth/better-auth/issues/5772)
- [Authentik Property Mappings](https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/)
- [Authentik Expressions](https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/expression/)
- [Authentik Nextcloud Integration (Groups Example)](https://integrations.goauthentik.io/chat-communication-collaboration/nextcloud/)
- [Federated Avatars in Authentik](https://dev.to/timo_reusch/federated-avatars-in-authentik-4le2)
- [Creating Custom Property Mappings (2025)](https://brunner.ninja/2025/07/04/creating-custom-property-mappings-for-oidc-oauth2-in-authentik/)
- [Authentik GitHub Discussion - Avatar URLs](https://github.com/goauthentik/authentik/discussions/6824)
