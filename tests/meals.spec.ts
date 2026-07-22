import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('saved meals', () => {
  test('saves selected entries as a meal and logs it on another day', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const rice = uniqueName('Rice')
    const chicken = uniqueName('Chicken')
    const mealName = uniqueName('Meal')
    const sourceDate = uniquePastDate()
    const targetDate = uniquePastDate()

    await api.createDiaryEntry({ date: sourceDate, meal: 'breakfast', name: rice, kcal: 100 })
    await api.createDiaryEntry({ date: sourceDate, meal: 'breakfast', name: chicken, kcal: 300 })
    try {
      // Long-press → select mode (pressed row preselected) → toggle the other.
      await diaryPage.gotoDate(sourceDate)
      await diaryPage.longPressEntry(rice)
      await diaryPage.enterSelectMode()
      await diaryPage.entryRow(chicken).click()
      await expect(diaryPage.selectionCount(2)).toBeVisible()
      await diaryPage.saveSelectionAsMeal(mealName)

      // Log the saved meal to a different day's dinner.
      await foodPickerPage.gotoFor(targetDate, 'dinner')
      await foodPickerPage.openMealsTab()
      await expect(foodPickerPage.savedMealRow(mealName)).toContainText('2 items')
      await expect(foodPickerPage.savedMealRow(mealName)).toContainText('400 calories')
      await foodPickerPage.logSavedMeal(mealName, 2, 'dinner')
      await foodPickerPage.finish()

      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRow(rice)).toBeVisible()
      await expect(diaryPage.entryRow(chicken)).toBeVisible()
      await expect(diaryPage.mealHeader('Dinner')).toContainText('400 calories')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(rice)
        await api.deleteDiaryEntriesByFoodName(chicken)
        await api.deleteMealsByName(mealName)
      })
    }
  })
})
