import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('food search and food form', () => {
  test('creates a manual food, logs it, and rescales it by serving size', async ({
    diaryPage,
    foodPickerPage,
    foodFormPage,
    api,
  }) => {
    const foodName = uniqueName('Granola')
    const date = uniquePastDate()

    try {
      await foodPickerPage.gotoFor(date, 'breakfast')
      await foodPickerPage.openNewFoodForm()
      await expect(foodFormPage.addHeading).toBeVisible()

      await foodFormPage.nameInput.fill(foodName)
      await foodFormPage.fillNutrients({ Calories: 100, Protein: 8 })
      await foodFormPage.saveButton.click()

      // Saving returns to the picker with the new food pre-selected for a
      // one-tap add.
      await expect(foodPickerPage.heading('breakfast')).toBeVisible()
      await expect(foodPickerPage.pickedSummary).toBeVisible()
      await foodPickerPage.addPickedButton(1, 'breakfast').click()
      await foodPickerPage.finish()

      await expect(diaryPage.entryRowKcal(foodName, 100)).toBeVisible()

      // Reopen the food and double the serving size — every nutrient rescales.
      await diaryPage.openAddFood('Breakfast')
      await foodPickerPage.searchAndOpen(foodName)
      await foodPickerPage.editFoodDetailsButton.click()
      await expect(foodFormPage.editHeading).toBeVisible()
      // The form populates async — wait for the stored values before editing,
      // or the load would overwrite the new serving size.
      await expect(foodFormPage.nutrient('Calories')).toHaveValue('100')
      await foodFormPage.rescaleServingSize(2)
      await expect(foodFormPage.nutrient('Calories')).toHaveValue('200')
      await expect(foodFormPage.nutrient('Protein')).toHaveValue('16')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })

  test('imports a USDA food with populated, per-100g nutrients', async ({
    foodPickerPage,
    foodFormPage,
    api,
    browserName,
    isMobile,
  }) => {
    // The USDA path is backend logic, not browser-specific — run it once on
    // desktop Chrome to keep external API calls (and cross-project cleanup
    // races on the shared account) out of the matrix.
    // eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
    test.skip(browserName !== 'chromium' || isMobile, 'runs on desktop Chrome only')

    const testStart = new Date().toISOString()
    try {
      await foodPickerPage.gotoFor(uniquePastDate(), 'lunch')
      await foodPickerPage.searchInput.fill('banana raw')
      await foodPickerPage.searchUsdaButton.click()
      await foodPickerPage.usdaResults.first().click()

      // Import lands in the serving sheet; open the full form to inspect it.
      await expect(foodPickerPage.servingsInput).toBeVisible()
      await foodPickerPage.editFoodDetailsButton.click()
      await expect(foodFormPage.editHeading).toBeVisible()

      // USDA data arrives per 100 g with real nutrient values.
      await expect(foodFormPage.servingSizeInput).toHaveValue('100')
      await expect(foodFormPage.servingUnitInput).toHaveValue('g')
      await expect(foodFormPage.nutrient('Calories')).toHaveValue(/^[1-9]\d*(\.\d+)?$/)
    } finally {
      // Imported foods keep their USDA names (not E2E-prefixed): delete by
      // source + creation time instead.
      await api.bestEffort(() => api.deleteUsdaFoodsCreatedAfter(testStart))
    }
  })

  test('deletes a food from the library via its long-press menu', async ({
    foodPickerPage,
    api,
  }) => {
    const foodName = uniqueName('Crackers')

    await api.createFood(foodName, { kcal: 120 })
    try {
      await foodPickerPage.gotoFor(uniquePastDate(), 'snacks')
      await foodPickerPage.searchInput.fill(foodName)
      await expect(foodPickerPage.foodRow(foodName)).toBeVisible()

      await foodPickerPage.longPressFood(foodName)
      await foodPickerPage.deleteFoodFromMenu()

      await expect(foodPickerPage.foodRow(foodName)).toBeHidden()
      // The app's "delete" is a soft delete: the row survives, archived, so
      // past diary snapshots that reference it stay intact.
      await expect
        .poll(() => api.isFoodArchived(foodName), { timeout: 10_000 })
        .toBe(true)
    } finally {
      await api.bestEffort(() => api.deleteFoodsByName(foodName))
    }
  })
})
