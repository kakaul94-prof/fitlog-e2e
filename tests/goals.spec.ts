import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

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
})
