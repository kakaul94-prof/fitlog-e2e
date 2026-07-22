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

})
