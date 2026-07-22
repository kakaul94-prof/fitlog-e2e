import { test as teardown } from '@playwright/test'
import { allAccounts } from '../utils/accounts'
import { SupabaseApi } from '../utils/supabase-api'

/**
 * Runs once after every browser project finishes (wired via the setup
 * project's `teardown` in playwright.config.ts): sweeps any E2E-prefixed
 * rows that a crashed or interrupted test failed to clean up itself — on
 * every configured test account (RLS scopes each sweep to its own account).
 */
teardown('sweep leftover E2E data', async () => {
  for (const creds of allAccounts()) {
    const api = await SupabaseApi.create({ creds })
    try {
      await api.sweepE2EData()
    } finally {
      await api.dispose()
    }
  }
})
