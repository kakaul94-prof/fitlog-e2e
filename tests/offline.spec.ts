import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('offline (PWA)', () => {
  // Service-worker + persisted-cache behavior is engine-independent; the
  // emulation is most reliable in desktop Chrome.
  // eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'runs on desktop Chrome only',
  )

  test('reads cached data offline and syncs a queued write on reconnect', async ({
    context,
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const seededName = uniqueName('Cached')
    const offlineName = uniqueName('Queued')
    const date = uniquePastDate()

    // Seed BEFORE the first fetch — the app persists its query cache, so this
    // load both renders the entry and stores it in IndexedDB.
    await api.createDiaryEntry({ date, meal: 'breakfast', name: seededName, kcal: 120 })
    try {
      await diaryPage.gotoDate(date)
      await expect(diaryPage.entryRow(seededName)).toBeVisible()

      // The very first load installs the service worker but isn't controlled
      // by it yet — wait for activation, then reload once online so the next
      // (offline) navigation is SW-served.
      await diaryPage.waitForServiceWorker()
      await diaryPage.gotoDate(date)
      await expect(diaryPage.entryRow(seededName)).toBeVisible()

      // Offline reload: the service worker serves the app shell and the
      // persisted cache serves the data.
      await context.setOffline(true)
      await diaryPage.gotoDate(date)
      await expect(diaryPage.entryRow(seededName)).toBeVisible()

      // A write while offline queues (status pill appears) instead of failing.
      await diaryPage.openAddFood('Breakfast')
      await foodPickerPage.quickAdd('breakfast', offlineName, 90)
      await expect(diaryPage.offlinePill).toBeVisible()

      // Reconnect → the queued mutation replays and lands in the database.
      await context.setOffline(false)
      await expect
        .poll(
          async () =>
            (await api.getDiaryEntries({ food_name: `eq.${offlineName}` })).length,
          { timeout: 15_000 },
        )
        .toBe(1)
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(seededName)
        await api.deleteDiaryEntriesByFoodName(offlineName)
      })
    }
  })
})
