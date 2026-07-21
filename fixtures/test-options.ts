import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { DiaryPage } from '../pages/DiaryPage'
import { FoodPickerPage } from '../pages/FoodPickerPage'
import { FoodFormPage } from '../pages/FoodFormPage'
import { LibraryPage } from '../pages/LibraryPage'
import { RecipeEditPage } from '../pages/RecipeEditPage'
import { BottomNav } from '../pages/components/BottomNav'
import { SupabaseApi } from '../utils/supabase-api'

interface Fixtures {
  loginPage: LoginPage
  diaryPage: DiaryPage
  foodPickerPage: FoodPickerPage
  foodFormPage: FoodFormPage
  libraryPage: LibraryPage
  recipeEditPage: RecipeEditPage
  bottomNav: BottomNav
  api: SupabaseApi
}

/**
 * Project-wide `test`: extends Playwright's with ready-made page objects and
 * an authenticated Supabase REST client (`api`) for seeding + cleanup.
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
  foodPickerPage: async ({ page }, use) => {
    await use(new FoodPickerPage(page))
  },
  foodFormPage: async ({ page }, use) => {
    await use(new FoodFormPage(page))
  },
  libraryPage: async ({ page }, use) => {
    await use(new LibraryPage(page))
  },
  recipeEditPage: async ({ page }, use) => {
    await use(new RecipeEditPage(page))
  },
  bottomNav: async ({ page }, use) => {
    await use(new BottomNav(page))
  },
  // eslint-disable-next-line no-empty-pattern
  api: async ({}, use) => {
    const api = await SupabaseApi.create()
    await use(api)
    await api.dispose()
  },
})

export const expect = test.expect
