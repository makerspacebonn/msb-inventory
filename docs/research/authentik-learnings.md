# Authentik Learnings (archived)

Authentik is no longer used; Kanidm is the only OAuth provider. These
Authentik-specific notes were moved out of `CLAUDE.md` for reference.
See also [authentik-oauth.md](./authentik-oauth.md) and
[authentik-better-auth-data-transfer.md](./authentik-better-auth-data-transfer.md).

## 2026-01-17 - OAuth Configuration
- **Configurable app slugs:** Use env vars like `AUTHENTIK_APP_SLUG` for provider-specific paths: `discoveryUrl: \`\${AUTHENTIK_URL}/application/o/\${AUTHENTIK_APP_SLUG}/.well-known/openid-configuration\``
- **OAuth email workaround:** When OAuth provider doesn't return email, generate synthetic: `email: profile.email || \`\${profile.sub}@authentik.local\``

## 2026-01-18 - Authentik OIDC Claims & Role Mapping
- **Authentik groups claim:** Use `user.ak_groups.all()` in Scope Mapping expressions to expose groups:
  ```python
  return {"groups": [group.name for group in user.ak_groups.all()]}
  ```
- **Authentik avatars:** Standard `picture` claim in `profile` scope, or custom via `user.attributes.get("avatar")` in Property Mapping
