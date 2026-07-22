import { test, expect } from '../fixtures/test-options'
import { requireEnv } from '../utils/env'

// These specs exercise the login form itself, so start signed out instead of
// consuming the storageState saved by auth.setup.ts.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('authentication', () => {
  test('signs in with valid credentials and lands on the Diary', async ({
    loginPage,
    diaryPage,
    bottomNav,
  }) => {
    await loginPage.goto()
    await loginPage.signIn(requireEnv('E2E_EMAIL'), requireEnv('E2E_PASSWORD'))

    await diaryPage.expectLoaded()
    await expect(bottomNav.tab('Diary')).toHaveAttribute('aria-current', 'page')
  })

  test('rejects an invalid password and stays signed out', async ({
    loginPage,
    diaryPage,
  }) => {
    await loginPage.goto()
    await loginPage.signIn(requireEnv('E2E_EMAIL'), 'definitely-not-the-password')

    await expect(loginPage.errorMessage).toContainText('Invalid login credentials')
    // Still on the login form — never authenticated.
    await expect(loginPage.signInButton).toBeVisible()
    await expect(diaryPage.heading).toBeHidden()
  })

  test('signing out returns to the login screen and stays out', async ({
    loginPage,
    diaryPage,
    bottomNav,
  }) => {
    // Self-contained session: sign in fresh, then sign out from More.
    // (Access tokens are stateless JWTs, so this can't disturb the other
    // workers' already-issued sessions mid-run.)
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
})
