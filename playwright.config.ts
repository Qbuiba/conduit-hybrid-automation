import { defineConfig, devices } from '@playwright/test';

/**
 * Conduit hybrid framework config.
 * - `setup` project runs global.setup.ts ONCE, writes an authenticated storageState.
 * - `api` project runs pure API tests (no browser, no storageState needed).
 * - `chromium` project runs UI + e2e tests, pre-authenticated via storageState.
 *
 * SUT is the containerized Conduit app (see docker-compose.yml). Uncomment `webServer`
 * once the compose file targets a real app — it boots the stack before tests run.
 */

export const STORAGE_STATE = 'playwright/.auth/user.json';

// Base URLs for the self-hosted Conduit SUT (TonyMckes example app).
export const UI_BASE_URL = process.env.UI_BASE_URL ?? 'http://localhost:3000';
export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: UI_BASE_URL,
    trace: 'on-first-retry',
    // Set SLOWMO=800 (ms) to slow each browser action so you can watch the flow.
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
  },

  projects: [
    {
      name: 'setup',
      testDir: '.',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: API_BASE_URL },
    },
    {
      name: 'chromium',
      testIgnore: /tests\/api\//,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE,
      },
    },
  ],

  // webServer: {
  //   command: 'docker compose up --wait',
  //   url: API_BASE_URL.replace(/\/api$/, '') + '/api/tags',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
