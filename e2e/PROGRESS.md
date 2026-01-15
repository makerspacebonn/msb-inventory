# E2E Test System Progress

## Summary

This document tracks our progress in building a containerized E2E test system for MSB Inventory using Playwright, Docker Compose, and GitHub Actions.

---

## What We Built

### Infrastructure
- **docker-compose.e2e.yml** - Isolated test environment with PostgreSQL, App, and Playwright containers
- **Dockerfile.e2e** - Custom Playwright image with Bun runtime
- **scripts/e2e-test.sh** - One-command test runner for local and CI
- **scripts/seed-e2e-data.ts** - Database seeder (35 items, 11 locations, 2 users)
- **.github/workflows/e2e-tests.yml** - CI pipeline with JUnit reporting

### Test Files (64 tests total, all passing)
- `e2e/tests/homepage.spec.ts` - ✅ 5 tests
- `e2e/tests/items.spec.ts` - ✅ 7 tests
- `e2e/tests/item-detail.spec.ts` - ✅ 8 tests
- `e2e/tests/locations.spec.ts` - ✅ 6 tests
- `e2e/tests/auth.spec.ts` - ✅ 8 tests
- `e2e/tests/item-crud.spec.ts` - ✅ 10 tests
- `e2e/tests/location-crud.spec.ts` - ✅ 8 tests
- `e2e/tests/changelog.spec.ts` - ✅ 12 tests

---

## Lessons Learned

### 1. Container Networking is Better Than Port Mapping
**Problem:** Mapping ports to host (e.g., `3001:3000`) caused issues with port conflicts and health check timing.

**Solution:** Run tests inside a container on the same Docker network. Services communicate via hostname (`http://app-e2e:3000`).

```yaml
# Tests access app via internal hostname, not localhost
environment:
  - E2E_BASE_URL=http://app-e2e:3000
```

### 2. PostgreSQL Extensions Must Be Pre-Installed
**Problem:** The app uses `gin_trgm_ops` for fuzzy search, which requires the `pg_trgm` extension.

**Solution:** Mount an init script that runs when the database container starts:
```sql
-- scripts/init-e2e-db.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 3. Official Playwright Image Lacks Bun
**Problem:** Microsoft's Playwright image has Node.js but not Bun.

**Solution:** Create a custom Dockerfile extending the official image:
```dockerfile
FROM mcr.microsoft.com/playwright:v1.57.0-noble
RUN apt-get update && apt-get install -y unzip
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"
```

### 4. `docker compose run` Can Be Slow
**Problem:** `docker compose run` with `depends_on: condition: service_healthy` re-checks health even if services are already healthy.

**Solution:** Remove `depends_on` from the playwright service and handle sequencing in the shell script. The script already waits for the app to be ready.

### 5. PostgreSQL Array Syntax
**Problem:** Drizzle ORM's `sql` template doesn't handle arrays correctly for raw INSERT statements.

**Solution:** Format arrays as PostgreSQL array literals:
```typescript
const tagsArray = `{${item.tags.join(",")}}`
await db.execute(sql`
  INSERT INTO items (tags) VALUES (${tagsArray}::varchar[])
`)
```

### 6. Playwright Selectors Need Specificity
**Problem:** Generic selectors like `a[href="/items"]` can match multiple elements.

**Solution:** Use `.first()` or more specific selectors:
```typescript
// Bad - matches multiple elements
const link = page.locator('a[href="/items"]')

// Good - explicit about which one
const link = page.locator('a[href="/items"]').first()
```

### 7. Parallel Workers Speed Up Tests
**Problem:** Sequential test execution is slow.

**Solution:** Configure multiple workers in Playwright:
```typescript
workers: process.env.E2E_WORKERS
  ? parseInt(process.env.E2E_WORKERS)
  : (process.env.CI ? 4 : undefined)
```

### 8. NODE_ENV Affects Cookie Security
**Problem:** Auth cookies weren't persisting across page navigations in E2E tests.

**Root cause:** With `NODE_ENV=production`, cookies are set with `secure: true`, but E2E uses HTTP (not HTTPS). Secure cookies are only sent over HTTPS, so the auth cookie was never included in subsequent requests.

**Solution:** Use `NODE_ENV=test` in the E2E environment:
```yaml
# docker-compose.e2e.yml
environment:
  - NODE_ENV=test  # NOT production - secure cookies break HTTP
```

**Key insight:** Always verify cookie settings match your test environment's protocol.

### 9. Button Type Defaults Vary by Framework
**Problem:** Tests using `button[type="submit"]` failed because the button wasn't found.

**Root cause:** The shadcn/ui Button component doesn't set a default `type` attribute. While HTML defaults buttons in forms to `type="submit"`, the actual rendered element may not have this attribute explicitly set.

**Solution:** Select buttons by their visible text instead:
```typescript
// Fragile - depends on type attribute
await page.locator('button[type="submit"]').click()

// Better - matches what users see
await page.locator('button:has-text("Erstellen")').click()
await page.locator('button:has-text("Speichern")').click()
```

### 10. Multiple Heading Elements Break Strict Mode
**Problem:** `page.locator("h1")` failed with "strict mode violation: resolved to 4 elements".

**Root cause:** The item detail page has multiple `h1` elements - one for the item name and one for each location in the breadcrumb chain.

**Solution:** Use `.first()` or more specific selectors:
```typescript
// Bad - fails if multiple h1 elements exist
await expect(page.locator("h1")).toContainText("Bohrmaschine")

// Good - explicitly selects first h1
await expect(page.locator("h1").first()).toContainText("Bohrmaschine")
```

---

## Remaining Challenges

### Medium Priority

#### 1. Test Selector Robustness
Many test selectors could be more robust.

**TODO:**
- [ ] Add `data-testid` attributes to key UI elements
- [ ] Update tests to use `getByTestId()` or `getByRole()`
- [ ] Avoid CSS class selectors (they change with styling)

#### 2. Test Data Isolation
Currently all tests share the same seeded database state.

**Potential Issues:**
- Tests that create/delete items affect other tests
- Parallel tests may have race conditions

**Possible Solutions:**
- [ ] Reset database before each test file (slower but safer)
- [ ] Use unique identifiers in test data (e.g., timestamps)
- [ ] Implement cleanup in `afterEach` hooks

#### 3. CI Pipeline Optimization
The current CI workflow works but could be faster.

**TODO:**
- [ ] Cache Docker layers between runs
- [ ] Cache Playwright browsers
- [ ] Consider running tests in parallel jobs (sharding)

### Low Priority

#### 4. Visual Regression Testing
Currently we only test functionality, not appearance.

**TODO:**
- [ ] Evaluate Playwright's screenshot comparison feature
- [ ] Set up baseline screenshots
- [ ] Configure acceptable diff thresholds

#### 5. Performance Testing
E2E tests don't currently measure performance.

**TODO:**
- [ ] Add performance marks to critical user journeys
- [ ] Set performance budgets
- [ ] Fail tests if pages load too slowly

#### 6. Mobile Viewport Testing
Tests only run on desktop Chrome.

**TODO:**
- [ ] Add mobile device configurations
- [ ] Test responsive layouts
- [ ] Consider adding Firefox/Safari projects

---

## Quick Reference

### Commands
```bash
# Run all E2E tests
bun e2e

# Run specific test file
bun e2e e2e/tests/homepage.spec.ts

# Run with custom worker count
E2E_WORKERS=8 bun e2e

# Run in headed mode (for debugging)
bun e2e --headed

# Open HTML report
bun e2e:report

# Run Playwright UI mode (local only)
bun e2e:ui
```

### File Locations
| File | Purpose |
|------|---------|
| `docker-compose.e2e.yml` | Test environment definition |
| `Dockerfile.e2e` | Playwright + Bun image |
| `scripts/e2e-test.sh` | Test runner script |
| `scripts/seed-e2e-data.ts` | Database seeder |
| `e2e/playwright.config.ts` | Playwright configuration |
| `e2e/fixtures/auth.fixture.ts` | Authentication helpers |
| `e2e/test-results/junit.xml` | CI test results |
| `e2e/playwright-report/` | HTML test report |

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://app-e2e:3000` | App URL for tests |
| `E2E_WORKERS` | 4 (CI) / auto (local) | Parallel workers |
| `CI` | - | Enables CI mode (retries, etc.) |

---

## Next Steps

1. **Short-term:** Add `data-testid` attributes to UI components for more stable selectors
2. **Medium-term:** Implement test data isolation strategy
3. **Long-term:** Add visual regression and performance testing
