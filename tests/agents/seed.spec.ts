import { test, expect } from '../../fixtures/test-options'

/**
 * Seed for Playwright's test agents (planner / generator / healer). It runs
 * through the suite's own fixtures, so the agents get the same per-worker
 * signed-in account and REST client a hand-written spec would, and it starts
 * every agent session from a blank Rehab centre (that state lives in its own
 * `profiles.rehab` column of the test account, nothing else is touched).
 */
test('seed', async ({ page, api }) => {
  await api.resetRehab()
  await page.goto('/rehab')
  await expect(
    page.getByRole('heading', { name: 'Rehab', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Nothing in rehab.')).toBeVisible()
})
