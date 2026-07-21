import { test, expect } from '../fixtures/test-options'

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
})
