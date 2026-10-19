// spec: specs/rehab.plan.md
// seed: tests/agents/seed.spec.ts

import { test, expect } from '../../../fixtures/test-options'

test.describe('Log an injury form', () => {
  test.beforeEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test.afterEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test('Create injury with every field set', async ({ page }) => {
    await page.goto('/rehab')
    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()

    // Dates relative to today: started 14 days ago -> "Day 15" (inclusive count)
    const started = new Date()
    started.setDate(started.getDate() - 14)
    const pad = (n: number) => String(n).padStart(2, '0')
    const startedIso = `${started.getFullYear()}-${pad(started.getMonth() + 1)}-${pad(started.getDate())}`
    const weekday = started.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = started.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

    // 1. Open the form ('Log an injury'), choose Knee, both, type the note,
    //    set Started to 14 days ago, click 'Start tracking'.
    await page.getByRole('button', { name: 'Log an injury' }).click()
    await page.getByRole('button', { name: 'Knee' }).click()
    await page.getByRole('button', { name: 'both' }).click()
    await page
      .getByRole('textbox', { name: 'Aches on overhead press' })
      .fill('E2E Twinge on deep squats')
    await page.locator('input[type="date"]').fill(startedIso)
    await page.getByRole('button', { name: 'Start tracking' }).click()

    await expect(
      page.getByRole('heading', { name: 'Both knee', level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByText(`Day 15 · started ${weekday}, ${monthDay}`),
    ).toBeVisible()
    await expect(page.getByText('E2E Twinge on deep squats')).toBeVisible()

    // 2. Go Back to /rehab.
    await page.getByRole('button', { name: 'Back' }).click()

    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()
    const card = page.getByRole('button', { name: /Both knee/ })
    await expect(card).toBeVisible()
    await expect(card).toContainText('Day 15')
  })
})
