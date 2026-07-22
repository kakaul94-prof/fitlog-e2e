import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

// Failure injection is browser-independent — run once on desktop Chrome.
// eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
test.skip(
  ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
  'runs on desktop Chrome only',
)

test.describe('backend-failure resilience', () => {
  test('a USDA outage surfaces an inline error instead of hanging', async ({
    page,
    foodPickerPage,
  }) => {
    // Kill every request to the USDA API before it leaves the browser.
    await page.route(
      (url) => url.hostname.includes('usda') || url.pathname.includes('usda'),
      (route) => route.abort('connectionfailed'),
    )

    await foodPickerPage.gotoFor(uniquePastDate(), 'lunch')
    await foodPickerPage.searchInput.fill('banana')
    await foodPickerPage.searchUsdaButton.click()

    // The failure renders as an inline error…
    await expect(foodPickerPage.errorText.first()).toBeVisible()
    // …and the flow recovers: editing the query clears the error state and
    // offers the search again.
    await foodPickerPage.searchInput.fill('banana bread')
    await expect(foodPickerPage.searchUsdaButton).toBeEnabled()
    await expect(foodPickerPage.errorText).toBeHidden()
  })

  test('diary reads recover from transient 500s via query retries', async ({
    page,
    diaryPage,
    api,
  }) => {
    const foodName = uniqueName('Resilience')
    const date = uniquePastDate()

    await api.createDiaryEntry({ date, meal: 'breakfast', name: foodName, kcal: 111 })
    try {
      // First two diary reads fail server-side; later attempts pass through.
      let failuresLeft = 2
      await page.route('**/rest/v1/diary_entries*', async (route) => {
        if (failuresLeft > 0) {
          failuresLeft--
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'injected outage' }),
          })
          return
        }
        await route.fallback()
      })

      await diaryPage.gotoDate(date)
      // TanStack Query retries the failed reads; the entry appears once the
      // backend "recovers" — no reload, no user action.
      await expect(diaryPage.entryRow(foodName)).toBeVisible({ timeout: 20_000 })
      expect(failuresLeft).toBe(0)
    } finally {
      await api.bestEffort(() => api.deleteDiaryEntriesByFoodName(foodName))
    }
  })
})
