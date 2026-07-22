import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('nutrient breakdown', () => {
  test('shows day totals with %DV and dashes for missing data', async ({
    page,
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const foodName = uniqueName('Beans')
    const date = uniquePastDate()

    // Fiber 14 g = exactly 50% of its 28 g Daily Value.
    await api.createFood(foodName, { kcal: 200, protein: 10, fiber: 14 })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Lunch')
      await foodPickerPage.searchAndOpen(foodName)
      await foodPickerPage.logServings('lunch', 1)
      await foodPickerPage.finish()
      await diaryPage.openNutrientBreakdown()

      // Row label spans (CSS, not getByText — the macro-pie toggle button is
      // also literally named "Calories").
      const row = (label: string) =>
        page.locator(`span:text-is("${label}")`).locator('..')
      await expect(row('Calories')).toContainText('200')
      await expect(row('Fiber')).toContainText('14 g')
      await expect(row('Fiber')).toContainText('50%')
      // Missing data renders as "—", explicitly distinct from zero.
      await expect(row('Sodium')).toContainText('—')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })
})
