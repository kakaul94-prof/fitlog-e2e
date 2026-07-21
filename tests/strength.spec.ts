import { test, expect } from '../fixtures/test-options'
import { uniqueName } from '../utils/test-data'

test.describe('strength', () => {
  test('logs a workout with sets, surfaces e1RM, and prefills from last time', async ({
    strengthPage,
    workoutPage,
    api,
  }) => {
    // A per-test custom exercise keeps history/PRs/prefill fully isolated
    // from parallel projects sharing the account.
    const exerciseName = uniqueName('Press')

    try {
      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addCustomExercise(exerciseName)
      await expect(workoutPage.setRows).toHaveCount(1)

      // 100 lb × 5 reps → Epley e1RM = 100 × (1 + 5/30) ≈ 117.
      await workoutPage.logSet(1, 100, 5)
      await expect(workoutPage.e1rm(117)).toBeVisible()

      await workoutPage.addSetButton.click()
      await expect(workoutPage.setRows).toHaveCount(2)
      await workoutPage.logSet(2, 105, 3)

      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()

      // "Last time" prefill: re-adding the exercise in a fresh workout creates
      // one blank row per set logged last session.
      await strengthPage.startEmptyWorkout()
      await workoutPage.addExistingExercise(exerciseName)
      await expect(workoutPage.setRows).toHaveCount(2)

      // Leaving an untouched workout auto-discards it (no exit prompt).
      await workoutPage.backButton.click()
      await expect(strengthPage.heading).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })
})
