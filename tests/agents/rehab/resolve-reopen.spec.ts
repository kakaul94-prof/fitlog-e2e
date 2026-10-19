// spec: specs/rehab.plan.md
// seed: tests/agents/seed.spec.ts

import { test, expect } from '../../../fixtures/test-options'

test.describe('Injury detail: status changes and delete', () => {
  test.beforeEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test.afterEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test('Mark resolved then Reopen', async ({ page }) => {
    await page.goto('/rehab')
    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()

    // Setup: default injury with one rehab exercise
    await page.getByRole('button', { name: 'Log an injury' }).click()
    await page.getByRole('button', { name: 'Start tracking' }).click()
    await expect(
      page.getByRole('heading', { name: 'Left shoulder', level: 1 }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Add rehab exercise' }).click()
    await page.getByRole('button', { name: 'Banded external rotation' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()

    const markResolved = page.getByRole('button', { name: 'Mark resolved' })
    const reopen = page.getByRole('button', { name: 'Reopen' })
    const painWidget = page.getByRole('heading', { name: /How is it today/ })
    const planHeading = page.getByRole('heading', {
      name: 'Rehab plan · this week',
    })
    const aggravatesHeading = page.getByRole('heading', { name: 'Aggravates' })

    await expect(page.getByText(/^Day \d+ · started /)).toBeVisible()
    await expect(painWidget).toBeVisible()

    // 1. On the active injury click 'Mark resolved'.
    await markResolved.click()
    await expect(page.getByText(/^Closed Today · ran \d+ days$/)).toBeVisible()
    await expect(painWidget).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Pain \d+ of 10$/ })).toHaveCount(0)
    await expect(reopen).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible()
    await expect(markResolved).toHaveCount(0)
    await expect(planHeading).toBeVisible()
    await expect(page.getByText('Banded external rotation')).toBeVisible()
    await expect(aggravatesHeading).toBeVisible()

    // 2. Click 'Reopen'.
    await reopen.click()
    await expect(page.getByText(/^Day \d+ · started /)).toBeVisible()
    await expect(painWidget).toBeVisible()
    await expect(markResolved).toBeVisible()
    await expect(reopen).toHaveCount(0)

    // 3. Resolve again, then go to /rehab (reload).
    await markResolved.click()
    await expect(reopen).toBeVisible()
    await page.goto('/rehab')
    await expect(
      page.getByRole('heading', { name: 'Resolved', level: 2 }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Left shoulder Closed Today · \d+ days$/ }),
    ).toBeVisible()
  })
})
