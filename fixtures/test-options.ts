import path from 'node:path'
import { test as base } from '@playwright/test'
import { STORAGE_STATE } from '../playwright.config'
import { accountForWorker } from '../utils/accounts'
import { LoginPage } from '../pages/LoginPage'
import { DiaryPage } from '../pages/DiaryPage'
import { FoodPickerPage } from '../pages/FoodPickerPage'
import { FoodFormPage } from '../pages/FoodFormPage'
import { LibraryPage } from '../pages/LibraryPage'
import { RecipeEditPage } from '../pages/RecipeEditPage'
import { DiaryEntryPage } from '../pages/DiaryEntryPage'
import { ExerciseAddPage } from '../pages/ExerciseAddPage'
import { RoutinePage } from '../pages/RoutinePage'
import { StrengthPage } from '../pages/StrengthPage'
import { WorkoutPage } from '../pages/WorkoutPage'
import { ProgressPage } from '../pages/ProgressPage'
import { ProfilePage } from '../pages/ProfilePage'
import { BottomNav } from '../pages/components/BottomNav'
import { SupabaseApi } from '../utils/supabase-api'

interface Fixtures {
  loginPage: LoginPage
  diaryPage: DiaryPage
  foodPickerPage: FoodPickerPage
  foodFormPage: FoodFormPage
  libraryPage: LibraryPage
  recipeEditPage: RecipeEditPage
  diaryEntryPage: DiaryEntryPage
  exerciseAddPage: ExerciseAddPage
  routinePage: RoutinePage
  strengthPage: StrengthPage
  workoutPage: WorkoutPage
  progressPage: ProgressPage
  profilePage: ProfilePage
  bottomNav: BottomNav
  api: SupabaseApi
}

interface WorkerFixtures {
  /** Path to this worker's authenticated storageState file. */
  workerStorageState: string
}

/**
 * Project-wide `test`: extends Playwright's with ready-made page objects and
 * an authenticated Supabase REST client (`api`) for seeding + cleanup.
 *
 * Auth is per WORKER: account 0 reuses the storageState saved by
 * tests/auth.setup.ts (a real UI login); workers mapped to the optional
 * E2E_EMAIL_W1..W3 accounts get a REST-minted state instead, which isolates
 * account-global features (profile, streak, latest weight) between parallel
 * workers. With no extra accounts configured every worker shares account 0 —
 * the original behavior.
 */
export const test = base.extend<Fixtures, WorkerFixtures>({
  workerStorageState: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      const { creds, accountIndex } = accountForWorker(workerInfo.workerIndex)
      if (accountIndex === 0) {
        await use(STORAGE_STATE)
        return
      }
      const file = path.join(
        path.dirname(STORAGE_STATE),
        `worker-${workerInfo.workerIndex}-acct${accountIndex}.json`,
      )
      await SupabaseApi.createStorageStateFile(creds, file)
      await use(file)
    },
    { scope: 'worker' },
  ],
  storageState: async ({ workerStorageState }, use) => {
    await use(workerStorageState)
  },
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
  diaryEntryPage: async ({ page }, use) => {
    await use(new DiaryEntryPage(page))
  },
  exerciseAddPage: async ({ page }, use) => {
    await use(new ExerciseAddPage(page))
  },
  routinePage: async ({ page }, use) => {
    await use(new RoutinePage(page))
  },
  strengthPage: async ({ page }, use) => {
    await use(new StrengthPage(page))
  },
  workoutPage: async ({ page }, use) => {
    await use(new WorkoutPage(page))
  },
  progressPage: async ({ page }, use) => {
    await use(new ProgressPage(page))
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page))
  },
  bottomNav: async ({ page }, use) => {
    await use(new BottomNav(page))
  },
  // The REST client authenticates as the same account as this worker's
  // browser contexts, so seeds/cleanup and UI always agree.
  api: async ({ workerStorageState }, use) => {
    const api = await SupabaseApi.create({ stateFile: workerStorageState })
    await use(api)
    await api.dispose()
  },
})

export const expect = test.expect
