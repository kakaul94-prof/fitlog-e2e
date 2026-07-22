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

  test('save & exit keeps edits; discard reverts to the on-open snapshot', async ({
    page,
    strengthPage,
    workoutPage,
    api,
  }) => {
    const exerciseName = uniqueName('Lunge')

    try {
      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addCustomExercise(exerciseName)
      await workoutPage.logSet(1, 100, 5)
      // The e1RM badge derives from SERVER state — once visible, the set has
      // landed and the exit guard sees the workout as dirty.
      await expect(workoutPage.e1rm(117)).toBeVisible()
      const workoutUrl = page.url()

      // Backing out of a dirty in-progress workout prompts; Save & exit keeps
      // the live-saved sets.
      await workoutPage.leaveAndSave()
      await expect(strengthPage.heading).toBeVisible()
      await page.goto(workoutUrl)
      await expect(workoutPage.exerciseTitle(exerciseName)).toBeVisible()
      await expect(workoutPage.weightInput(1)).toHaveValue('100')

      // Edit this session, then discard: the set reverts to the open snapshot.
      await workoutPage.logSet(1, 120, 8)
      await expect(workoutPage.e1rm(152)).toBeVisible() // 120 × (1 + 8/30)
      await workoutPage.leaveAndDiscard()
      await expect(strengthPage.heading).toBeVisible()
      // Assert the restore on the SERVER — a UI reopen inside the persisted
      // cache's stale window would still show the pre-discard values.
      const key = await api.getCustomExerciseKey(exerciseName)
      await expect
        .poll(async () => (await api.getWorkoutSetValues(key))[0], {
          timeout: 10_000,
        })
        .toEqual({ weight_lb: 100, reps: 5 })
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })

  test('links two exercises into a superset with shared timing', async ({
    strengthPage,
    workoutPage,
    api,
  }) => {
    const first = uniqueName('Bench')
    const second = uniqueName('Row')

    try {
      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addCustomExercise(first)
      await workoutPage.addSupersetCustomExercise(second)

      // The linked block renders with a shared label and a single Done —
      // member cards lose their own "Superset" buttons and timing rows.
      await expect(workoutPage.supersetBlockLabel).toBeVisible()
      await expect(workoutPage.supersetButton).toBeHidden()
      await expect(workoutPage.setRows).toHaveCount(2)

      // One set in each member: 100×5 → e1RM 117, 60×10 → e1RM 80.
      await workoutPage.logSet(1, 100, 5)
      await expect(workoutPage.e1rm(117)).toBeVisible()
      await workoutPage.logSet(2, 60, 10)
      await expect(workoutPage.e1rm(80)).toBeVisible()

      // Block Done stamps every member; the whole block rolls into Completed.
      await workoutPage.blockDoneButton.click()
      await expect(workoutPage.completedSection).toContainText('Completed (1)')

      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteStrengthDataForExercise(first)
        await api.deleteStrengthDataForExercise(second)
      })
    }
  })

  test('a strength goal produces suggested weights in the next session', async ({
    strengthPage,
    workoutPage,
    api,
  }) => {
    const exerciseName = uniqueName('Squat')

    try {
      // Session 1: 3×5 @ 100 lb (hits a linear goal's rep target).
      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addCustomExercise(exerciseName)
      await workoutPage.addSetButton.click()
      await workoutPage.addSetButton.click()
      await workoutPage.logSet(1, 100, 5)
      await workoutPage.logSet(2, 100, 5)
      await workoutPage.logSet(3, 100, 5)
      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()

      // Goal: linear progression, +5 lb per session, 3×5.
      const key = await api.getCustomExerciseKey(exerciseName)
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

      // Session 2: the exercise arrives with three sets pre-filled at the
      // suggested next load (100 + 5) and the goal's rep floor.
      await strengthPage.startEmptyWorkout()
      await workoutPage.addExistingExercise(exerciseName)
      await expect(workoutPage.setRows).toHaveCount(3)
      const spinbuttons = workoutPage.spinbuttons
      await expect(spinbuttons.nth(0)).toHaveValue('105')
      await expect(spinbuttons.nth(1)).toHaveValue('5')
      await expect(spinbuttons.nth(4)).toHaveValue('105')

      // Prefilled values count as logged content — finish cleanly.
      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })

  test('shows records and history on the exercise detail page', async ({
    page,
    strengthPage,
    workoutPage,
    api,
  }) => {
    const exerciseName = uniqueName('Curl')

    try {
      await strengthPage.goto()
      await strengthPage.startEmptyWorkout()
      await workoutPage.addCustomExercise(exerciseName)
      await workoutPage.logSet(1, 100, 5)
      await workoutPage.addSetButton.click()
      await workoutPage.logSet(2, 105, 3)
      await workoutPage.markDoneButton.click()
      await expect(strengthPage.heading).toBeVisible()

      // The detail page lives under the exercise's key.
      const key = await api.getCustomExerciseKey(exerciseName)
      await page.goto(`/lift/exercise/${key}`)
      await expect(
        page.getByRole('heading', { name: exerciseName, level: 1 }),
      ).toBeVisible()

      // Records derived from the logged sets: heaviest 105×3; best single-set
      // volume 100×5 = 500 lb; session tonnage 500 + 315 = 815 lb.
      await expect(page.getByText('Heaviest set')).toBeVisible()
      // Appears in both the Records card and the session history row.
      await expect(page.getByText('105 lb × 3').first()).toBeVisible()
      // The record values embed their detail text (e.g. "500 lb 100 × 5").
      await expect(page.getByText('500 lb')).toBeVisible()
      await expect(page.getByText('815 lb')).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteStrengthDataForExercise(exerciseName))
    }
  })
})
