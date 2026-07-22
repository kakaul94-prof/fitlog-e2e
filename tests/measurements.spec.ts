import { test, expect } from '../fixtures/test-options'
import { uniquePastDate } from '../utils/test-data'

test.describe('body measurements', () => {
  test('logs a weight entry and shows it in the Progress history', async ({
    progressPage,
    api,
  }) => {
    // Unique two-decimal value (never ending in 0, so the display matches the
    // typed string exactly).
    const value = 130 + Math.floor(Math.random() * 10) + (11 + Math.floor(Math.random() * 88)) / 100

    try {
      await progressPage.goto()
      await progressPage.logWeight(value)
      await expect(progressPage.measurementValue(value)).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteMeasurements('weight', value))
    }
  })

  test('edits a history entry date and deletes another', async ({
    progressPage,
    api,
  }) => {
    const uniqueValue = () =>
      130 + Math.floor(Math.random() * 10) + (11 + Math.floor(Math.random() * 88)) / 100
    const keptValue = uniqueValue()
    const removedValue = uniqueValue()
    const originalDate = uniquePastDate()
    const editedDate = uniquePastDate()

    // Far-past dates: they never become the account's "latest" weight.
    await api.createMeasurement({ date: originalDate, value: keptValue })
    await api.createMeasurement({ date: uniquePastDate(), value: removedValue })
    try {
      await progressPage.goto()
      await expect(progressPage.measurementValue(keptValue)).toBeVisible()
      await expect(progressPage.measurementValue(removedValue)).toBeVisible()

      // Re-date one row via its hidden date input; the row shows the new date.
      await progressPage.changeRowDate(keptValue, editedDate)
      await expect(progressPage.measurementDate(editedDate)).toBeVisible()

      // Delete the other row.
      await progressPage.deleteRow(removedValue)
      await expect(progressPage.measurementValue(removedValue)).toBeHidden()
      await expect(progressPage.measurementValue(keptValue)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteMeasurements('weight', keptValue)
        await api.deleteMeasurements('weight', removedValue)
      })
    }
  })
})
