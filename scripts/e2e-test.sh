#!/bin/bash
#
# E2E Test Runner Script
#
# Runs Playwright tests inside a Docker container connected to the app via Docker network.
#
# Usage:
#   ./scripts/e2e-test.sh              # Run all tests
#   ./scripts/e2e-test.sh --headed     # Not supported in container mode
#   ./scripts/e2e-test.sh auth.spec.ts # Run specific test file
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.e2e.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

cleanup() {
    log_info "Cleaning up E2E environment..."
    docker compose -f "$COMPOSE_FILE" --profile test down -v --remove-orphans 2>/dev/null || true
}

main() {
    cd "$PROJECT_ROOT"

    echo ""
    echo "========================================"
    echo "  MSB Inventory E2E Test Runner"
    echo "========================================"
    echo ""

    # Trap for cleanup on exit
    trap cleanup EXIT

    # 1. Clean up any existing containers
    log_step "Cleaning up existing containers..."
    cleanup 2>/dev/null || true

    # 2. Build and start the app (without test profile)
    log_step "Building and starting app containers..."
    docker compose -f "$COMPOSE_FILE" up -d --build

    # 3. Wait for app to be healthy
    log_step "Waiting for app to be healthy..."
    docker compose -f "$COMPOSE_FILE" up -d --wait || {
        log_warn "Health check wait timed out, checking manually..."
    }

    # Verify app is actually responding
    local max_attempts=30
    local attempt=0
    until docker compose -f "$COMPOSE_FILE" exec -T app-e2e wget -q --spider http://localhost:3000/ 2>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            log_error "Application failed to start after $max_attempts attempts"
            docker compose -f "$COMPOSE_FILE" logs app-e2e --tail=50
            exit 1
        fi
        echo -n "."
        sleep 2
    done
    echo ""
    log_info "Application is ready!"

    # 4. Run database seed
    log_step "Seeding test database..."
    docker compose -f "$COMPOSE_FILE" exec -T app-e2e \
        bun run /usr/src/scripts/seed-e2e-data.ts || {
        log_error "Database seeding failed"
        exit 1
    }
    log_info "Database seeded successfully"

    # 5. Create output directories
    mkdir -p "$PROJECT_ROOT/e2e/test-results"
    mkdir -p "$PROJECT_ROOT/e2e/playwright-report"

    # 6. Build playwright image if needed
    log_step "Building Playwright test runner..."
    docker compose -f "$COMPOSE_FILE" build playwright

    # 7. Run Playwright tests in container
    log_step "Running Playwright tests..."
    echo ""

    docker compose -f "$COMPOSE_FILE" run --rm \
        -e CI=${CI:-false} \
        playwright \
        bun playwright test --config=e2e/playwright.config.ts "$@"

    local exit_code=$?

    echo ""
    echo "========================================"
    echo "  Test Results"
    echo "========================================"

    # 7. Report locations
    if [ -f "$PROJECT_ROOT/e2e/test-results/junit.xml" ]; then
        log_info "JUnit XML report: e2e/test-results/junit.xml"
    fi

    if [ -d "$PROJECT_ROOT/e2e/playwright-report" ]; then
        log_info "HTML report: e2e/playwright-report/index.html"
        log_info "View report with: bun e2e:report"
    fi

    echo ""
    if [ $exit_code -eq 0 ]; then
        log_info "All tests passed!"
    else
        log_error "Some tests failed (exit code: $exit_code)"
    fi

    exit $exit_code
}

main "$@"
