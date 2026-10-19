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

  test('Delete injury for good', async ({ page }) => {
    await page.goto('/rehab')
    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()

    // Setup: default injury (the only one); capture its URL
    await page.getByRole('button', { name: 'Log an injury' }).click()
    await page.getByRole('button', { name: 'Start tracking' }).click()
    await expect(
      page.getByRole('heading', { name: 'Left shoulder', level: 1 }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/rehab\/[^/]+$/)
    const injuryUrl = page.url()
    const injuryPath = new URL(injuryUrl).pathname

    // 1. Click 'Delete' then 'Delete for good'.
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Delete for good' }).click()
    await expect(page).toHaveURL(/\/rehab$/)
    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Left shoulder/ }),
    ).toHaveCount(0)
    await expect(page.getByText(/^Nothing in rehab\./)).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Resolved', level: 2 }),
    ).toHaveCount(0)

    // 2. Navigate directly to the deleted injury's URL.
    await page.goto(injuryPath)
    await expect(page.getByText('That injury is no longer here.')).toBeVisible()
  })
})
