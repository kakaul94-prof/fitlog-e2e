import { test, expect } from '../fixtures/test-options'
import { localDateISO, uniqueName, uniquePastDate } from '../utils/test-data'

// Both tests mutate the account's single profile row, so they are gated to
// one project AND run sequentially in one worker (overriding fullyParallel).
test.describe.configure({ mode: 'default' })

test.describe('calorie goal', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'the profile row is global state — runs on desktop Chrome only',
  )

  test('setting a manual calorie target updates the diary goal', async ({
    diaryPage,
    profilePage,
    api,
  }) => {
    const original = await api.getProfile()
    const target = 2000 + Math.floor(Math.random() * 900)

    try {
      await profilePage.goto()
      await profilePage.expectLoaded(original.calorie_goal_mode === 'manual')
      await profilePage.setManualCalorieGoal(target)

      await diaryPage.goto()
      await diaryPage.expectLoaded()
      await expect(diaryPage.calorieGoal(target)).toBeVisible()
    } finally {
      // Restore the exact stored goal state (including the dated history).
      await api.bestEffort(() =>
        api.updateProfile(original.id, {
          calorie_goal_mode: original.calorie_goal_mode,
          manual_calorie_goal: original.manual_calorie_goal,
          calorie_goal_history: original.calorie_goal_history,
        }),
      )
    }
  })

  test('eat-back credits exercise calories to the day remaining', async ({
    diaryPage,
    exerciseAddPage,
    api,
  }) => {
    const original = await api.getProfile()
    const goal = 2000 + Math.floor(Math.random() * 900)
    const foodName = uniqueName('Bagel')
    const activityName = uniqueName('Spin')
    const date = uniquePastDate()
    const foodKcal = 500
    const burnedKcal = 222

    try {
      // Known goal state via REST: manual goal + eat-back on, no dated history
      // (so the past test date resolves to the live goal).
      await api.updateProfile(original.id, {
        calorie_goal_mode: 'manual',
        manual_calorie_goal: goal,
        calorie_goal_history: [], // non-null column; empty → past dates use the live goal
        eat_back_exercise: true,
      })
      await api.createDiaryEntry({ date, meal: 'lunch', name: foodName, kcal: foodKcal })

      await diaryPage.gotoDate(date)
      await diaryPage.openAddExercise()
      await exerciseAddPage.logCardio(activityName, 30, burnedKcal)

      // remaining = goal − food + exercise, shown on the calorie dial.
      await diaryPage.expectLoaded()
      await expect(diaryPage.calorieGoal(goal)).toBeVisible()
      await expect(diaryPage.foodTotal(foodKcal)).toBeVisible()
      await expect(diaryPage.exerciseCredit(burnedKcal)).toBeVisible()
      await expect(
        diaryPage.remainingRing(goal - foodKcal + burnedKcal),
      ).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.updateProfile(original.id, {
          calorie_goal_mode: original.calorie_goal_mode,
          manual_calorie_goal: original.manual_calorie_goal,
          calorie_goal_history: original.calorie_goal_history,
          eat_back_exercise: original.eat_back_exercise,
        })
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteExerciseEntriesByName(activityName)
      })
    }
  })

  test('macro target modes resolve into the diary macro bars', async ({
    diaryPage,
    profilePage,
    api,
  }) => {
    const original = await api.getProfile()

    try {
      // 2000 kcal, protein fixed 150 g, fat 30% (600 kcal → ~67 g), carbs
      // take the remainder: (2000 − 600 − 600) / 4 = 200 g.
      await profilePage.goto()
      await profilePage.expectLoaded(original.calorie_goal_mode === 'manual')
      await profilePage.manualGoalCheckbox.check()
      await profilePage.manualTargetInput.fill('2000')
      await profilePage.setMacroTarget('Protein', 'grams', 150)
      await profilePage.setMacroTarget('Fat', '% of calories', 30)
      await profilePage.save()

      // Today's diary (goal history applies to past days) — nothing logs
      // protein/carbs today, so the bars read 0/target.
      await diaryPage.goto()
      await diaryPage.expectLoaded()
      await expect(diaryPage.macroBar('0/150g')).toBeVisible()
      await expect(diaryPage.macroBar('0/200g')).toBeVisible()
    } finally {
      await api.bestEffort(() =>
        api.updateProfile(original.id, {
          calorie_goal_mode: original.calorie_goal_mode,
          manual_calorie_goal: original.manual_calorie_goal,
          calorie_goal_history: original.calorie_goal_history,
          macro_targets: original.macro_targets,
        }),
      )
    }
  })

  test('backfilling yesterday heals the streak', async ({ diaryPage, api }) => {
    const today = localDateISO(0)
    const yesterday = localDateISO(-1)
    const todayName = uniqueName('Today')
    const yesterdayName = uniqueName('Yesterday')

    try {
      // All backfill happens BEFORE the app's first fetch: the app persists
      // its query cache (IndexedDB, staleTime 60s), so data changed by REST
      // after a page has loaded is not re-read on reload within that window.
      // A fresh Playwright context carries no IndexedDB, so the first load
      // computes the streak from the network.
      await api.deleteE2EDiaryEntriesOn(yesterday)
      await api.createDiaryEntry({ date: today, meal: 'snacks', name: todayName, kcal: 50 })
      await api.createDiaryEntry({
        date: yesterday,
        meal: 'snacks',
        name: yesterdayName,
        kcal: 50,
      })

      // Only these two E2E rows can exist on today/yesterday → the streak is
      // exactly 2, which requires the backfilled yesterday to be counted.
      await diaryPage.goto()
      await diaryPage.expectLoaded()
      await expect(diaryPage.streakBadge).toHaveText('2')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(todayName)
        await api.deleteDiaryEntriesByFoodName(yesterdayName)
      })
    }
  })
})
