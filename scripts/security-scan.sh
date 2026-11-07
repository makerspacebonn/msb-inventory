#!/usr/bin/env bash
# Checks for known vulnerabilities: the production image with Trivy, and all
# dependencies (including development ones) with bun audit. Each run is
# logged in docs/SecurityScans.md, so it's visible when the last one was.
#   bun run security:scan
set -uo pipefail

IMAGE="msb-inventory:security-scan"
TRIVY="aquasec/trivy:0.76.2"
LOG="docs/SecurityScans.md"

echo "== Building the production image"
if ! docker build -q -t "$IMAGE" . >/dev/null; then
  echo "The image could not be built" >&2
  exit 1
fi

echo "== Trivy (production image)"
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME/.cache/trivy:/root/.cache/trivy" \
  "$TRIVY" image --quiet --scanners vuln,secret,misconfig --exit-code 1 "$IMAGE"
trivy_status=$?
docker rmi -f "$IMAGE" >/dev/null

echo
echo "== bun audit (all dependencies)"
audit_output=$(bun audit 2>&1)
audit_status=$?
echo "$audit_output"

trivy_result=$([ $trivy_status -eq 0 ] && echo "clean" || echo "findings")
audit_result=$(echo "$audit_output" | grep -E "^[0-9]+ vulnerabilit" || echo "no vulnerabilities")
if [ ! -f "$LOG" ]; then
  printf "# Security Scans\n\nWritten by \`bun run security:scan\`, newest last.\n\n| Date | Image (Trivy) | Dependencies (bun audit) |\n|---|---|---|\n" >"$LOG"
fi
echo "| $(date +%Y-%m-%d) | $trivy_result | $audit_result |" >>"$LOG"
echo
echo "Logged in $LOG"

[ $trivy_status -eq 0 ] && [ $audit_status -eq 0 ]
