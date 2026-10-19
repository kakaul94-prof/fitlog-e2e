// spec: specs/rehab.plan.md
// seed: tests/agents/seed.spec.ts

import { test, expect } from '../../../fixtures/test-options'

test.describe('Injury detail: rehab plan exercises', () => {
  test.beforeEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test.afterEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test("Log sessions with 'Done today' and Undo", async ({ page }) => {
    await page.goto('/rehab')
    await expect(
      page.getByRole('heading', { name: 'Rehab', exact: true }),
    ).toBeVisible()

    // Setup: default injury with 'Banded external rotation' (target 3 / week)
    await page.getByRole('button', { name: 'Log an injury' }).click()
    await page.getByRole('button', { name: 'Start tracking' }).click()
    await expect(
      page.getByRole('heading', { name: 'Left shoulder', level: 1 }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Add rehab exercise' }).click()
    await page.getByRole('button', { name: 'Banded external rotation' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()

    const doneToday = page.getByRole('button', { name: 'Done today' })
    const undo = page.getByRole('button', { name: 'Undo' })

    await expect(page.getByText('0 / 3', { exact: true })).toBeVisible()
    await expect(undo).toHaveCount(0)

    // 1. Click 'Done today' on the exercise.
    await doneToday.click()
    await expect(page.getByText('1 / 3', { exact: true })).toBeVisible()
    await expect(undo).toBeVisible()

    // 2. Click 'Done today' again (multiple sessions per day allowed).
    await doneToday.click()
    await expect(page.getByText('2 / 3', { exact: true })).toBeVisible()

    // 3. Click 'Undo'.
    await undo.click()
    await expect(page.getByText('1 / 3', { exact: true })).toBeVisible()

    // 4. Click 'Done today' past the target (4 times with target 3).
    // Observed: the counter does not cap, it shows 5 / 3.
    for (const n of [2, 3, 4, 5]) {
      await doneToday.click()
      await expect(page.getByText(`${n} / 3`, { exact: true })).toBeVisible()
    }
    await expect(doneToday).toBeVisible()
    await expect(undo).toBeVisible()

    // 5. Reload the page.
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Left shoulder', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('5 / 3', { exact: true })).toBeVisible()
  })
})
