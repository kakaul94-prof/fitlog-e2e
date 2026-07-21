import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { DiaryPage } from '../pages/DiaryPage'
import { BottomNav } from '../pages/components/BottomNav'

interface Fixtures {
  loginPage: LoginPage
  diaryPage: DiaryPage
  bottomNav: BottomNav
}

/**
 * Project-wide `test`: extends Playwright's with ready-made page objects.
 * Specs import { test, expect } from here and receive pages via destructuring.
 * Auth comes from the storageState saved by tests/auth.setup.ts (configured
 * per-project in playwright.config.ts), not from a fixture.
 */
export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  diaryPage: async ({ page }, use) => {
    await use(new DiaryPage(page))
  },
  bottomNav: async ({ page }, use) => {
    await use(new BottomNav(page))
  },
})

export const expect = test.expect
