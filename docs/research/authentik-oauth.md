# Research: Authentik OAuth/OIDC Setup

> Authentik is an open-source Identity Provider that supports OAuth2, OIDC, SAML, and more.

**Official Documentation:** https://docs.goauthentik.io/

---

## Creating an OAuth2/OIDC Provider

1. Log in to Authentik Admin
2. Navigate to **Applications > Applications**
3. Click **Create with provider**
4. Select **OAuth2/OIDC** as Provider Type
5. Configure:
   - **Name:** MSB Inventory
   - **Client ID:** Auto-generated or custom
   - **Client Secret:** Auto-generated
   - **Redirect URIs:** `{BASE_URL}/api/auth/callback/authentik`

**Source:** https://docs.goauthentik.io/add-secure-apps/providers/oauth2/create-oauth2-provider/

---

## Key Endpoints

| Endpoint | URL |
|----------|-----|
| Authorization | `{AUTHENTIK_URL}/application/o/authorize/` |
| Token | `{AUTHENTIK_URL}/application/o/token/` |
| UserInfo | `{AUTHENTIK_URL}/application/o/userinfo/` |
| Discovery | `{AUTHENTIK_URL}/application/o/{app-slug}/.well-known/openid-configuration` |

---

## Group Claims

To include user groups in OIDC claims:

### 1. Create Scope Mapping

Navigate to **Customisation > Property Mappings** and create a new **Scope Mapping**:

**Name:** `groups`
**Scope name:** `groups`
**Expression:**
```python
return {
    "groups": [group.name for group in request.user.ak_groups.all()]
}
```

### 2. Assign to Provider

Edit the OAuth2 provider and add the `groups` scope mapping to **Scopes**.

### 3. Enable in ID Token

Check **"Include claims in id_token"** in provider settings.

**Source:** https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/

---

## Role Mapping Strategy

Map Authentik groups to application roles via environment variables:

```bash
# .env
AUTHENTIK_ADMIN_GROUPS=makerspace-admins,inventory-admins
AUTHENTIK_EDITOR_GROUPS=makerspace-editors,inventory-editors
```

```typescript
// src/lib/auth-roles.ts
export type AppRole = "user" | "editor" | "admin"

const adminGroups = process.env.AUTHENTIK_ADMIN_GROUPS?.split(",") || []
const editorGroups = process.env.AUTHENTIK_EDITOR_GROUPS?.split(",") || []

export function mapAuthentikGroupsToRole(groups: string[]): AppRole {
  if (groups.some(g => adminGroups.includes(g))) return "admin"
  if (groups.some(g => editorGroups.includes(g))) return "editor"
  return "user"
}
```

---

## Authentik Configuration Checklist

- [ ] Create OAuth2/OIDC application in Authentik
- [ ] Configure redirect URI: `{BASE_URL}/api/auth/callback/authentik`
- [ ] Create `groups` scope mapping
- [ ] Add scope mapping to provider
- [ ] Enable "Include claims in id_token"
- [ ] Create Authentik groups for roles (e.g., `makerspace-admins`)
- [ ] Assign users to appropriate groups

---

## Testing OAuth Flow

1. Start dev server: `bun dev`
2. Navigate to `/login`
3. Click "Mit Authentik anmelden"
4. Authorize in Authentik
5. Verify redirect back to app
6. Check user in database has correct role
