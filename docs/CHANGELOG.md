# Changelog

All notable changes to MSB Inventory will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-01-17

### Added
- better-auth library (v1.4.14) for authentication
- Database tables for better-auth: `users`, `sessions`, `accounts`, `verifications`
- Admin plugin fields in users table for role-based access control
- Environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- Email/password authentication with registration and login
- Authentik OAuth integration via genericOAuth plugin
- "Mit Authentik anmelden" button on login page
- Comprehensive E2E tests for authentication flows
- `src/lib/auth.ts` - Server-side better-auth configuration
- `src/lib/auth-client.ts` - Client-side auth utilities with React hooks
- `src/routes/api/auth/$.ts` - Catch-all API route handler

### Changed
- Users table expanded with email, emailVerified, role, timestamps
- Updated `.env_example` with better-auth and Authentik configuration
- Login page now supports email/password with signup toggle
- AuthContext simplified to use better-auth's `useSession` hook
- `__root.tsx` gets user data from AuthContext instead of separate API call

### Removed
- Legacy JWT-based authentication (`createToken`, `verifyToken`)
- `src/routes/auth.callback.tsx` - better-auth handles OAuth callbacks
- Discord OAuth configuration from `.env_example`
- `JWT_SECRET` environment variable

### Technical
- Completed AUTH-001: Install better-auth and configure database schema
- Completed AUTH-002: Implement better-auth core configuration
- Completed AUTH-003: Implement email/password authentication
- Completed AUTH-004: Implement Authentik OAuth integration
- Completed AUTH-007: Update middleware and context
- Completed AUTH-009: Cleanup legacy code
