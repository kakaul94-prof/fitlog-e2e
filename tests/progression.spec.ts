import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

/**
 * Progression-engine scenarios beyond the happy path (strength.spec covers
 * the +increment case). History is REST-seeded — the engine reads the most
 * recently inserted sets as the last session.
 */
test.describe('strength progression', () => {
  test('two stalled sessions suggest a ~10% deload', async ({
    strengthPage,
    workoutPage,
    api,
  }) => {
    const exerciseName = uniqueName('Squat')

    try {
      const key = await api.createCustomExercise(exerciseName)
      // Two sessions at the same top weight, both missing 3×5 → stall.
      const miss = [
        { weightLb: 100, reps: 3 },
        { weightLb: 100, reps: 3 },
        { weightLb: 100, reps: 3 },
      ]
      await api.createCompletedWorkout({
        exerciseKey: key,
        exerciseName,
        date: uniquePastDate(),
        sets: miss,
      })
      await api.createCompletedWorkout({
        exerciseKey: key,
        exerciseName,
        date: uniquePastDate(),
        sets: miss,
      })
      await api.createStrengthGoal({
        exerciseKey: key,
        exerciseName,
        targetWeightLb: 150,
        targetReps: 5,
        target1rmLb: 175,
        method: 'linear',
        incrementLb: 5,
        repLow: 5,
        repHigh: 8,
        sets: 3,
      })

      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addExistingExercise(exerciseName)

      // Deload: round5(100 × 0.9) = 90 lb at the bottom of the rep range.
      await expect(workoutPage.setRows).toHaveCount(3)
      await expect(workoutPage.weightInput(1)).toHaveValue('90')
      await expect(workoutPage.repsInput(1)).toHaveValue('5')

      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })

  test('double progression adds a rep at the same weight until the range tops out', async ({
    strengthPage,
    workoutPage,
    api,
  }) => {
    const exerciseName = uniqueName('Press')

    try {
      const key = await api.createCustomExercise(exerciseName)
      // 3×6 at 100 in a 5–8 range: not at the ceiling → same weight, +1 rep.
      await api.createCompletedWorkout({
        exerciseKey: key,
        exerciseName,
        date: uniquePastDate(),
        sets: [
          { weightLb: 100, reps: 6 },
          { weightLb: 100, reps: 6 },
          { weightLb: 100, reps: 6 },
        ],
      })
      await api.createStrengthGoal({
        exerciseKey: key,
        exerciseName,
        targetWeightLb: 150,
        targetReps: 8,
        target1rmLb: 175,
        method: 'double',
        incrementLb: 5,
        repLow: 5,
        repHigh: 8,
        sets: 3,
      })

      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addExistingExercise(exerciseName)

      await expect(workoutPage.setRows).toHaveCount(3)
      await expect(workoutPage.weightInput(1)).toHaveValue('100')
      await expect(workoutPage.repsInput(1)).toHaveValue('7')

      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })

  test('the goal card shows progress and the next suggestion, and can be deleted', async ({
    page,
    api,
  }) => {
    const exerciseName = uniqueName('Deadlift')

    try {
      const key = await api.createCustomExercise(exerciseName)
      await api.createCompletedWorkout({
        exerciseKey: key,
        exerciseName,
        date: uniquePastDate(),
        sets: [
          { weightLb: 100, reps: 5 },
          { weightLb: 100, reps: 5 },
          { weightLb: 100, reps: 5 },
        ],
      })
      await api.createStrengthGoal({
        exerciseKey: key,
        exerciseName,
        targetWeightLb: 150,
        targetReps: 5,
        target1rmLb: 175,
        method: 'linear',
        incrementLb: 5,
        repLow: 5,
        repHigh: 8,
        sets: 3,
      })

      await page.goto(`/lift/exercise/${key}`)
      await expect(
        page.getByRole('heading', { name: exerciseName, level: 1 }),
      ).toBeVisible()

      // Hit 3×5 @ 100 → next suggestion is +5 lb; current e1RM ≈ 117.
      await expect(page.getByText('Strength goal')).toBeVisible()
      await expect(page.getByText('3 × 5 @ 105 lb')).toBeVisible()
      await expect(page.getByText(/Now ~117 lb/)).toBeVisible()

      // Delete the goal (confirm dialog) → the set-a-goal prompt returns.
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Delete goal' }).click()
      await expect(
        page.getByRole('button', { name: 'Set a strength goal' }),
      ).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })
})
