import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Workers: use E2E_WORKERS env var, or default to 4 in CI, 50% of cores locally
  workers: process.env.E2E_WORKERS
    ? parseInt(process.env.E2E_WORKERS, 10)
    : process.env.CI
      ? 4
      : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /(backup|search-counting)\.spec\.ts/,
    },
    // Compares exact numbers, so no other test may search at the same time
    {
      name: "counting",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /search-counting\.spec\.ts/,
      dependencies: ["chromium"],
    },
    // Restoring replaces the whole database, so it must not run alongside
    // other tests
    {
      name: "backup",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /backup\.spec\.ts/,
      dependencies: ["counting"],
    },
  ],

  timeout: 10000,
  expect: {
    timeout: 5000,
  },

  outputDir: "test-results",
})
