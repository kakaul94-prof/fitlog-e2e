import { test as setup } from '@playwright/test'
import { STORAGE_STATE } from '../playwright.config'
import { LoginPage } from '../pages/LoginPage'
import { DiaryPage } from '../pages/DiaryPage'
import { requireEnv } from '../utils/env'

/**
 * Runs once before the browser projects: signs in through the real login form
 * and saves the Supabase session (localStorage) to STORAGE_STATE, so every
 * other test starts already authenticated — faster and less flaky than logging
 * in per test.
 */
setup('authenticate as the E2E user', async ({ page }) => {
  const loginPage = new LoginPage(page)
  const diaryPage = new DiaryPage(page)

  await loginPage.goto()
  await loginPage.expectLoaded()
  await loginPage.signIn(requireEnv('E2E_EMAIL'), requireEnv('E2E_PASSWORD'))
  await diaryPage.expectLoaded()

  await page.context().storageState({ path: STORAGE_STATE })
})
