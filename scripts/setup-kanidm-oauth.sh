#!/bin/bash
#
# Kanidm OIDC Setup Script for MSB Inventory
#
# Registers this app as a confidential OAuth2/OIDC client (a "resource server")
# in Kanidm, gates access to a group, and exposes an admin-group claim that the
# app maps to the "admin" role.
#
# Prerequisites:
#   - `kanidm` CLI installed and logged in with an account that can manage
#     oauth2 (e.g. `kanidm login -D idm_admin`).
#   - The access group (ACCESS_GROUP) and admin group (ADMIN_GROUP) already
#     exist in Kanidm, e.g.:
#       kanidm group create msb_users
#       kanidm group create zeug-admin
#       kanidm group add-members zeug-admin your-username
#
# Usage:
#   ./scripts/setup-kanidm-oauth.sh                 # uses the defaults below
#   APP_ORIGIN=https://zeug.example.de \
#     ADMIN_GROUP=admins ./scripts/setup-kanidm-oauth.sh   # override via env
#
# The script is idempotent: re-running it updates the existing client instead
# of failing. It never prints the client secret to logs — it writes guidance on
# where to retrieve it at the end.
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — override any of these via environment variables.
# ---------------------------------------------------------------------------
CLIENT_ID="${CLIENT_ID:-msb-inventory}"                       # KANIDM_CLIENT_ID
DISPLAY_NAME="${DISPLAY_NAME:-MSB Inventory}"                 # shown on consent screen
APP_ORIGIN="${APP_ORIGIN:-https://zeug.makerspacebonn.de}"   # app base URL (no trailing slash)
ACCESS_GROUP="${ACCESS_GROUP:-msb_users}"                     # group allowed to log in
ADMIN_GROUP="${ADMIN_GROUP:-zeug-admin}"                      # group mapped to app admin (== KANIDM_ADMIN_GROUP)
GROUPS_CLAIM="${GROUPS_CLAIM:-groups}"                        # claim name the app reads

# Also register the local-dev callback so the same client works from localhost.
INCLUDE_LOCALHOST="${INCLUDE_LOCALHOST:-true}"
LOCALHOST_ORIGIN="${LOCALHOST_ORIGIN:-http://localhost:3000}"

# Derived — the redirect URI is dictated by better-auth's genericOAuth plugin:
#   {origin}/api/auth/oauth2/callback/{providerId}   (providerId is "kanidm")
CALLBACK_PATH="/api/auth/oauth2/callback/kanidm"
REDIRECT_URL="${APP_ORIGIN}${CALLBACK_PATH}"
LOCALHOST_REDIRECT_URL="${LOCALHOST_ORIGIN}${CALLBACK_PATH}"

# Colors (match scripts/e2e-test.sh)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
if ! command -v kanidm >/dev/null 2>&1; then
  log_error "The 'kanidm' CLI is not installed or not on PATH."
  log_error "Install it, then run 'kanidm login -D idm_admin' before this script."
  exit 1
fi

echo ""
log_info "Kanidm OIDC setup for '${DISPLAY_NAME}'"
echo "  Client ID     : ${CLIENT_ID}"
echo "  App origin    : ${APP_ORIGIN}"
echo "  Redirect URL  : ${REDIRECT_URL}"
echo "  Access group  : ${ACCESS_GROUP} (members may log in)"
echo "  Admin group   : ${ADMIN_GROUP} -> app role 'admin'"
echo "  Groups claim  : ${GROUPS_CLAIM} (array)"
if [ "${INCLUDE_LOCALHOST}" = "true" ]; then
  echo "  + localhost   : ${LOCALHOST_REDIRECT_URL}"
fi
echo ""
read -r -p "Proceed? [y/N] " confirm
case "${confirm}" in
  [yY][eE][sS] | [yY]) ;;
  *)
    log_warn "Aborted."
    exit 0
    ;;
esac

# ---------------------------------------------------------------------------
# 1. Create (or reuse) the confidential OAuth2 client
# ---------------------------------------------------------------------------
log_step "1/5 Ensuring OAuth2 client '${CLIENT_ID}' exists"
if kanidm system oauth2 get "${CLIENT_ID}" >/dev/null 2>&1; then
  log_info "Client already exists — skipping create (redirect URLs updated below)."
else
  kanidm system oauth2 create "${CLIENT_ID}" "${DISPLAY_NAME}" "${APP_ORIGIN}"
  log_info "Created confidential client."
fi

# ---------------------------------------------------------------------------
# 2. Whitelist redirect URL(s) — exact match required by Kanidm
# ---------------------------------------------------------------------------
log_step "2/5 Registering redirect URL(s)"
kanidm system oauth2 add-redirect-url "${CLIENT_ID}" "${REDIRECT_URL}"
log_info "Added: ${REDIRECT_URL}"
if [ "${INCLUDE_LOCALHOST}" = "true" ]; then
  kanidm system oauth2 add-redirect-url "${CLIENT_ID}" "${LOCALHOST_REDIRECT_URL}"
  log_info "Added: ${LOCALHOST_REDIRECT_URL}"
fi

# ---------------------------------------------------------------------------
# 3. Scope map — grants OIDC scopes AND gates who may log in (members only)
# ---------------------------------------------------------------------------
log_step "3/5 Granting scopes to group '${ACCESS_GROUP}'"
kanidm system oauth2 update-scope-map "${CLIENT_ID}" "${ACCESS_GROUP}" openid email profile
log_info "Members of '${ACCESS_GROUP}' can now obtain openid/email/profile."

# ---------------------------------------------------------------------------
# 4. Claim map — emit the admin group name in a 'groups' claim (as an array)
# ---------------------------------------------------------------------------
log_step "4/5 Exposing '${ADMIN_GROUP}' membership in the '${GROUPS_CLAIM}' claim"
# 'array' join is REQUIRED: the app checks Array.isArray(claims.groups). csv/ssv
# would arrive as a string and admin detection would silently fail.
kanidm system oauth2 update-claim-map-join "${CLIENT_ID}" "${GROUPS_CLAIM}" array
kanidm system oauth2 update-claim-map "${CLIENT_ID}" "${GROUPS_CLAIM}" "${ADMIN_GROUP}" "${ADMIN_GROUP}"
log_info "Members of '${ADMIN_GROUP}' will receive ${GROUPS_CLAIM}=[\"${ADMIN_GROUP}\"]."

# ---------------------------------------------------------------------------
# 5. Report the client secret location (never printed to logs)
# ---------------------------------------------------------------------------
log_step "5/5 Client secret"
echo ""
log_info "Setup complete. Now populate the demo server's .env:"
echo ""
echo "    KANIDM_URL=<your kanidm base url, e.g. https://idm.example.com>"
echo "    KANIDM_CLIENT_ID=${CLIENT_ID}"
echo "    KANIDM_ADMIN_GROUP=${ADMIN_GROUP}"
echo "    KANIDM_CLIENT_SECRET=<value from the command below>"
echo ""
log_warn "Retrieve the secret directly on the server (do not paste it into chat/logs):"
echo ""
echo "    kanidm system oauth2 show-basic-secret ${CLIENT_ID}"
echo ""
log_info "Then redeploy the app so src/lib/auth.ts picks up the config, and log in via Kanidm."
