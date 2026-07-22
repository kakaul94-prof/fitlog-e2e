import { test, expect } from '../fixtures/test-options'
import { uniqueName } from '../utils/test-data'

test.describe('workout templates', () => {
  test('creates a template with targets and starts a workout from it', async ({
    strengthPage,
    routinePage,
    workoutPage,
    api,
  }) => {
    const routineName = uniqueName('Push')
    const exerciseName = uniqueName('Fly')

    try {
      await strengthPage.goto()
      await strengthPage.openNewTemplate()
      await expect(routinePage.newHeading).toBeVisible()

      await routinePage.nameInput.fill(routineName)
      await routinePage.addCustomExercise(exerciseName)
      await routinePage.setTargets(3, 8)
      await routinePage.saveButton.click()
      await expect(strengthPage.heading).toBeVisible()

      // Reopen the saved template — name and targets persisted.
      await strengthPage.openRoutine(routineName)
      await expect(routinePage.editHeading).toBeVisible()
      await expect(routinePage.nameInput).toHaveValue(routineName)
      await expect(routinePage.targetSetsInput).toHaveValue('3')
      await expect(routinePage.targetRepsInput).toHaveValue('8')
      await routinePage.backButton.click()

      // Start from the Templates list: the workout takes the routine's name
      // and its exercise, beginning with one deliberately blank set row
      // (the app does not preload target numbers into the boxes).
      await strengthPage.startRoutine(routineName)
      await expect(workoutPage.exerciseTitle(exerciseName)).toBeVisible()
      await expect(workoutPage.setRows).toHaveCount(1)

      // Nothing logged → leaving auto-discards the blank workout.
      await workoutPage.backButton.click()
      await expect(strengthPage.heading).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteRoutinesByName(routineName)
        await api.deleteStrengthDataForExercise(exerciseName)
      })
    }
  })
})
