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

  test('edits a logged session, keeping its manual calorie override', async ({
    diaryPage,
    exerciseAddPage,
    api,
  }) => {
    const activityName = uniqueName('Elliptical')
    const date = uniquePastDate()

    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddExercise()
      await exerciseAddPage.logCardio(activityName, 30, 222)
      await expect(diaryPage.exerciseRow(activityName)).toBeVisible()

      // Tap the row → edit form (prefilled async, override detected).
      await diaryPage.exerciseRow(activityName).click()
      await exerciseAddPage.expectEditLoaded(30)
      await exerciseAddPage.setDuration(45)
      await exerciseAddPage.saveChangesButton.click()

      await diaryPage.expectLoaded()
      const row = diaryPage.exerciseRow(activityName)
      await expect(row).toContainText('45 min')
      await expect(row).toContainText('222 calories')
    } finally {
      await api.bestEffort(() => api.deleteExerciseEntriesByName(activityName))
    }
  })

  test('a custom activity estimates burn from MET and body weight', async ({
    diaryPage,
    exerciseAddPage,
    api,
    browserName,
    isMobile,
  }) => {
    // The estimate reads the account's LATEST weight — a global. Run on one
    // project and pin "latest" with a far-future-dated seed row.
    // eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
    test.skip(browserName !== 'chromium' || isMobile, 'runs on desktop Chrome only')

    const activityName = uniqueName('Rucking')
    const date = uniquePastDate()
    const weightLb = 150
    const met = 6
    const minutes = 30
    // metCalories: MET × 3.5 × kg / 200 × minutes.
    const expected = Math.round(((met * 3.5 * (weightLb / 2.20462)) / 200) * minutes)

    await api.createMeasurement({ date: '2099-01-01', value: weightLb })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddExercise()
      await exerciseAddPage.createCustomActivity(activityName, met)
      await exerciseAddPage.logEstimated(minutes)

      await diaryPage.expectLoaded()
      const row = diaryPage.exerciseRow(activityName)
      await expect(row).toBeVisible()
      await expect(row).toContainText(`${expected} calories`)
    } finally {
      await api.bestEffort(async () => {
        await api.deleteExerciseEntriesByName(activityName)
        await api.deleteCustomActivitiesByName(activityName)
        await api.deleteMeasurements('weight', weightLb)
      })
    }
  })
})
