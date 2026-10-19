import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'
import 'dotenv/config'

/**
 * Auth session saved once by tests/auth.setup.ts and reused by every project.
 * Gitignored — it contains a live Supabase token.
 */
export const STORAGE_STATE = path.join(__dirname, '.auth', 'user.json')

const baseURL = process.env.BASE_URL ?? 'https://fitlog-9wl.pages.dev'

/**
 * Playwright test agents (planner / generator / healer, see README). Their
 * seed and the specs they generate live in tests/agents/ and stay out of the
 * main suite until reviewed: the project exists only when PW_AGENTS is set,
 * which .mcp.json does for the agents' MCP server.
 */
const AGENT_SPECS = /[\\/]agents[\\/]/
const agentsEnabled = !!process.env.PW_AGENTS

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The target is a remote deployment: one local retry absorbs cold-start
  // stalls (surfaced as "flaky" in the report, not hidden); CI gets two.
  retries: process.env.CI ? 2 : 1,
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
      testIgnore: [/signout\.spec\.ts/, AGENT_SPECS],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: [/signout\.spec\.ts/, AGENT_SPECS],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: [/signout\.spec\.ts/, AGENT_SPECS],
    },
    {
      // FitLog is phone-first — run the suite in a real mobile viewport too.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
      testIgnore: [/signout\.spec\.ts/, AGENT_SPECS],
    },
    ...(agentsEnabled
      ? [
          {
            name: 'agents',
            testMatch: AGENT_SPECS,
            use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
            dependencies: ['setup'],
          },
        ]
      : []),
    {
      // Signing out revokes every session for the shared account, so this
      // runs strictly after all browser projects have finished.
      name: 'signout',
      testMatch: /signout\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: [
        'chromium',
        'firefox',
        'webkit',
        'mobile-chrome',
        ...(agentsEnabled ? ['agents'] : []),
      ],
    },
  ],
})
