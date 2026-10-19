// spec: specs/rehab.plan.md
// seed: tests/agents/seed.spec.ts

import { test, expect } from '../../../fixtures/test-options'

test.describe('Injury detail: pain rating', () => {
  test.beforeEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test.afterEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test('Re-rating on the same day replaces the rating', async ({ page }) => {
    await page.goto('/rehab')
    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()

    // Create an injury with default values
    await page.getByRole('button', { name: 'Log an injury' }).click()
    await page.getByRole('button', { name: 'Start tracking' }).click()
    await expect(
      page.getByRole('heading', { name: 'Left shoulder', level: 1 }),
    ).toBeVisible()

    // 1. Click 'Pain 7 of 10' then 'Pain 3 of 10'.
    await page.getByRole('button', { name: 'Pain 7 of 10' }).click()
    await page.getByRole('button', { name: 'Pain 3 of 10' }).click()

    await expect(page.getByText(/Rated 3\/10 once\./)).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()

    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Left shoulder/ }),
    ).toContainText('pain 3/10')
  })
})
