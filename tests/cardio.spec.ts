import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('cardio', () => {
  test('logs a cardio session and shows its burned calories on the diary', async ({
    diaryPage,
    exerciseAddPage,
    api,
  }) => {
    const activityName = uniqueName('Rowing')
    const date = uniquePastDate()
    const minutes = 30
    const calories = 222 // manual override — independent of body weight

    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddExercise()
      await exerciseAddPage.logCardio(activityName, minutes, calories)

      // Saving returns to the diary for the same date.
      await diaryPage.expectLoaded()
      const row = diaryPage.exerciseRow(activityName)
      await expect(row).toBeVisible()
      await expect(row).toContainText(`${minutes} min`)
      await expect(row).toContainText(`${calories} calories`)
    } finally {
      await api.bestEffort(() => api.deleteExerciseEntriesByName(activityName))
    }
  })
})
