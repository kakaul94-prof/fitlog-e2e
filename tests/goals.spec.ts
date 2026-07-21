import { test, expect } from '../fixtures/test-options'

test.describe('calorie goal', () => {
  test('setting a manual calorie target updates the diary goal', async ({
    diaryPage,
    profilePage,
    api,
    browserName,
    isMobile,
  }) => {
    // The profile is one shared row — parallel browser projects mutating it
    // would race each other, so this runs on desktop Chrome only.
    // eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
    test.skip(browserName !== 'chromium' || isMobile, 'runs on desktop Chrome only')

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
})
