import { test, expect } from '../fixtures/test-options'
import { requireEnv } from '../utils/env'

// Signing out revokes ALL of the account's sessions server-side (global
// scope), which breaks any still-running test whose mutation validates the
// session (auth.getUser → 403). This spec therefore lives in its own
// project that depends on every browser project — it runs strictly last.
test.use({ storageState: { cookies: [], origins: [] } })

test('signing out returns to the login screen and stays out', async ({
  loginPage,
  diaryPage,
  bottomNav,
}) => {
  await loginPage.goto()
  await loginPage.signIn(requireEnv('E2E_EMAIL'), requireEnv('E2E_PASSWORD'))
  await diaryPage.expectLoaded()

  await bottomNav.goTo('More')
  await loginPage.signOutButton.click()
  await loginPage.expectLoaded()

  // Navigating anywhere afterwards still lands on the login form.
  await diaryPage.goto()
  await expect(loginPage.signInButton).toBeVisible()
  await expect(diaryPage.heading).toBeHidden()
})
