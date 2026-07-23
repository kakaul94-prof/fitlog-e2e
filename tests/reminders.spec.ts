import { test, expect } from '../fixtures/test-options'

/**
 * Meal reminders + streak check-in (More → Reminders). Scheduling is
 * Android-native; on the web the page renders fully but disabled, with an
 * explanatory notice — that web contract is what this spec pins.
 */
test.describe('reminders', () => {
  test('the page renders its disabled web state with every slot listed', async ({
    page,
  }) => {
    await page.goto('/reminders')
    await expect(
      page.getByRole('heading', { name: 'Reminders', level: 1 }),
    ).toBeVisible({ timeout: 20_000 })

    // The web notice explains reminders ring from the Android app.
    await expect(page.getByText(/ring from the FitLog Android app/)).toBeVisible()

    // All four meal slots plus the streak check-in render, switches disabled.
    for (const slot of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
      await expect(page.getByRole('switch', { name: `${slot} reminder` })).toBeDisabled()
    }
    await expect(page.getByRole('switch', { name: 'Streak check-in' })).toBeDisabled()

    // No native scheduling on web → the test-notification action stays hidden.
    await expect(
      page.getByRole('button', { name: 'Send a test notification' }),
    ).toBeHidden()
  })
})
