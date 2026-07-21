import { test as teardown } from '@playwright/test'
import { SupabaseApi } from '../utils/supabase-api'

/**
 * Runs once after every browser project finishes (wired via the setup
 * project's `teardown` in playwright.config.ts): sweeps any E2E-prefixed
 * rows that a crashed or interrupted test failed to clean up itself.
 */
teardown('sweep leftover E2E data', async () => {
  const api = await SupabaseApi.create()
  try {
    await api.sweepE2EData()
  } finally {
    await api.dispose()
  }
})
