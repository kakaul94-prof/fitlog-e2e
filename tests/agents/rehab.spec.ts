// Reviewed from playwright-test-generator output (raw version: commit 3e6577e)
// for specs/rehab.plan.md items 2.3, 3.3, 4.9, 6.1 and 6.4.
import { test, expect } from '../../fixtures/test-options'
import { localDateISO } from '../../utils/test-data'

// The whole Rehab centre is one jsonb column, and the app rewrites all of it
// from its cached copy on every save. Tests that reset or change it must not
// overlap on one account, so they run in order on one worker (and the agents
// project is desktop Chrome only).
test.describe.configure({ mode: 'default' })

test.describe('rehab centre', () => {
  test.beforeEach(async ({ api, rehabPage }) => {
    // Not best-effort: a test that starts from someone else's injuries is invalid.
    await api.resetRehab()
    await rehabPage.open()
    await expect(rehabPage.emptyState).toBeVisible()
  })

  test.afterEach(async ({ api }) => {
    await api.bestEffort(() => api.resetRehab())
  })

  test('2.3 create injury with every field set', async ({ page, rehabPage, injuryPage, api }) => {
    const started = localDateISO(-14)
    const note = 'E2E Twinge on deep squats'

    await rehabPage.logInjury({ site: 'Knee', side: 'both', note, started })
    const id = await injuryPage.expectLoaded('Both knee')
    // The day count is inclusive: started 14 days ago = day 15.
    await expect(injuryPage.statusLine).toHaveText(/^Day 15 · started /)
    await expect(page.getByText(note, { exact: true })).toBeVisible()
    await expect
      .poll(async () => (await api.getRehab()).injuries)
      .toEqual([
        expect.objectContaining({ id, site: 'knee', side: 'both', note, started, status: 'active' }),
      ])

    await injuryPage.backButton.click()
    await expect(rehabPage.injuryCard('Both knee')).toContainText('Day 15')
  })

  test('3.3 re-rating on the same day replaces the rating', async ({
    page,
    rehabPage,
    injuryPage,
    api,
  }) => {
    await rehabPage.logInjury()
    const id = await injuryPage.expectLoaded('Left shoulder')

    await injuryPage.painButton(7).click()
    await injuryPage.painButton(3).click()
    // One rating for today, not two: with two the hint turns into a chart.
    await expect(page.getByText(/^Rated 3\/10 once\./)).toBeVisible()
    await expect
      .poll(async () =>
        (await api.getRehab()).checkins.filter((c) => c.injuryId === id).map((c) => c.pain),
      )
      .toEqual([3])

    await injuryPage.backButton.click()
    await expect(rehabPage.injuryCard('Left shoulder')).toContainText('pain 3/10')
  })

  test("4.9 log sessions with 'Done today' and Undo", async ({
    page,
    rehabPage,
    injuryPage,
    api,
  }) => {
    await rehabPage.logInjury()
    const id = await injuryPage.expectLoaded('Left shoulder')
    await injuryPage.addLibraryExercise('Banded external rotation')
    // One plan row (default target 3/week), so its counter is the only "n / 3".
    const counter = (done: number) => page.getByText(`${done} / 3`, { exact: true })
    await expect(counter(0)).toBeVisible()
    await expect(injuryPage.undoButton).toHaveCount(0)

    await injuryPage.doneTodayButton.click()
    await expect(counter(1)).toBeVisible()
    await injuryPage.doneTodayButton.click() // a second sitting the same day counts
    await expect(counter(2)).toBeVisible()
    await injuryPage.undoButton.click()
    await expect(counter(1)).toBeVisible()
    // Past the weekly target the counter keeps counting rather than capping.
    for (const n of [2, 3, 4]) {
      await injuryPage.doneTodayButton.click()
      await expect(counter(n)).toBeVisible()
    }

    // Stored, not just painted: four sessions against this injury today.
    await expect
      .poll(
        async () =>
          (await api.getRehab()).log.filter((e) => e.injuryId === id && e.date === localDateISO())
            .length,
      )
      .toBe(4)
  })

  test('6.1 mark resolved then reopen', async ({ page, rehabPage, injuryPage, api }) => {
    const statusOf = async (id: string) =>
      (await api.getRehab()).injuries.find((i) => i.id === id)?.status

    await rehabPage.logInjury()
    const id = await injuryPage.expectLoaded('Left shoulder')
    await injuryPage.addLibraryExercise('Banded external rotation')
    await expect(injuryPage.statusLine).toHaveText('Day 1 · started Today')
    await expect(injuryPage.painWidget).toBeVisible()

    await injuryPage.markResolvedButton.click()
    // "ran 1 days" is a FitLog plural bug, pinned in its own test below.
    await expect(injuryPage.statusLine).toHaveText(/^Closed Today · ran 1 days?$/)
    await expect(injuryPage.painWidget).toHaveCount(0)
    await expect(injuryPage.reopenButton).toBeVisible()
    await expect(injuryPage.markResolvedButton).toHaveCount(0)
    // Resolving keeps the plan (read-only: its row buttons are hidden).
    await expect(page.getByText('Banded external rotation', { exact: true })).toBeVisible()
    await expect(injuryPage.doneTodayButton).toHaveCount(0)
    await expect.poll(() => statusOf(id)).toBe('resolved')

    await injuryPage.reopenButton.click()
    await expect(injuryPage.statusLine).toHaveText('Day 1 · started Today')
    await expect(injuryPage.painWidget).toBeVisible()
    await expect.poll(() => statusOf(id)).toBe('active')

    await injuryPage.markResolvedButton.click()
    await expect(injuryPage.reopenButton).toBeVisible()
    await rehabPage.open()
    await expect(rehabPage.resolvedHeading).toBeVisible()
    await expect(rehabPage.injuryCard('Left shoulder')).toContainText('Closed Today')
    await expect(rehabPage.emptyState).toBeVisible() // nothing left under Active
  })

  test('6.4 delete injury for good', async ({ page, rehabPage, injuryPage, api }) => {
    await rehabPage.logInjury()
    const id = await injuryPage.expectLoaded('Left shoulder')

    await injuryPage.deleteButton.click()
    await injuryPage.deleteForGoodButton.click()
    await expect(page).toHaveURL(/\/rehab$/)
    await expect(rehabPage.emptyState).toBeVisible()
    await expect(rehabPage.injuryCard('Left shoulder')).toHaveCount(0)
    await expect.poll(async () => (await api.getRehab()).injuries).toEqual([])

    // Its old link explains itself instead of erroring.
    await page.goto(`/rehab/${id}`)
    await expect(injuryPage.notFound).toBeVisible()
  })

  // Added in review, not generated. FitLog doesn't pluralise the resolved
  // subtitle ("Closed Today · ran 1 days"). Expected to fail until fixed
  // upstream, then it reports "unexpectedly passed" and the pin comes off.
  test('a one-day injury reads "ran 1 day" once resolved', async ({ rehabPage, injuryPage }) => {
    test.fail()
    await rehabPage.logInjury()
    await injuryPage.expectLoaded('Left shoulder')
    await injuryPage.markResolvedButton.click()
    await expect(injuryPage.reopenButton).toBeVisible()
    await expect(injuryPage.statusLine).toHaveText('Closed Today · ran 1 day', { timeout: 3_000 })
  })
})
