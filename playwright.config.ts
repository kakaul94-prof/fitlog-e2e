import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import 'dotenv/config'

/**
 * Auth session saved once by tests/auth.setup.ts and reused by every project.
 * Gitignored — it contains a live Supabase token.
 */
export const STORAGE_STATE = path.join(__dirname, '.auth', 'user.json')

const baseURL = process.env.BASE_URL ?? 'https://fitlog-9wl.pages.dev'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  // The app under test is a remote deployment backed by Supabase — allow a
  // little more than the defaults for data-backed UI and multi-step flows.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, teardown: 'cleanup' },
    { name: 'cleanup', testMatch: /cleanup\.teardown\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      // FitLog is phone-first — run the suite in a real mobile viewport too.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
})
