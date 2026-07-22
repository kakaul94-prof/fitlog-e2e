import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('diary entry editing', () => {
  test('edits servings and meal of a logged entry, then deletes it', async ({
    diaryPage,
    diaryEntryPage,
    foodPickerPage,
    api,
  }) => {
    const foodName = uniqueName('Yogurt')
    const date = uniquePastDate()

    await api.createFood(foodName, { kcal: 100 })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Breakfast')
      await foodPickerPage.searchAndOpen(foodName)
      await foodPickerPage.logServings('breakfast', 1)
      await foodPickerPage.finish()

      // Tap the row → entry detail; edit meal and servings (snapshot rescales).
      await diaryPage.entryRow(foodName).click()
      await diaryEntryPage.expectLoaded(foodName, 1)
      await diaryEntryPage.setMeal('lunch')
      await diaryEntryPage.setServings(3)
      await diaryEntryPage.backButton.click()

      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRow(foodName)).toContainText('300 calories')
      await expect(diaryPage.mealHeader('Lunch')).toContainText('300 calories')

      // Reopen and delete — the row and its calories disappear.
      await diaryPage.entryRow(foodName).click()
      await diaryEntryPage.expectLoaded(foodName, 3)
      await diaryEntryPage.deleteEntry()
      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRow(foodName)).toBeHidden()
      await expect(diaryPage.mealHeader('Lunch')).toContainText('0 calories')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })
})
