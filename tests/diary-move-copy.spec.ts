import { test, expect } from '../fixtures/test-options'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('diary move and copy', () => {
  test('moves an entry to another meal and copies entries to another day', async ({
    diaryPage,
    api,
  }) => {
    const rice = uniqueName('Rice')
    const chicken = uniqueName('Chicken')
    const sourceDate = uniquePastDate()
    const targetDate = uniquePastDate()

    await api.createDiaryEntry({ date: sourceDate, meal: 'breakfast', name: rice, kcal: 100 })
    await api.createDiaryEntry({ date: sourceDate, meal: 'breakfast', name: chicken, kcal: 300 })
    try {
      // Move a single entry via its long-press sheet.
      await diaryPage.gotoDate(sourceDate)
      await diaryPage.longPressEntry(rice)
      await diaryPage.moveEntryTo('Lunch')
      await expect(diaryPage.mealHeader('Lunch')).toContainText('100 calories')
      await expect(diaryPage.mealHeader('Breakfast')).toContainText('300 calories')

      // Copy both entries to another day; the app jumps to it.
      await diaryPage.longPressEntry(chicken)
      await diaryPage.enterSelectMode()
      await diaryPage.entryRow(rice).click()
      await expect(diaryPage.selectionCount(2)).toBeVisible()
      await diaryPage.copySelectionToDay(targetDate)

      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRow(rice)).toBeVisible()
      await expect(diaryPage.entryRow(chicken)).toBeVisible()
      // Copies land in their original meals on the target day.
      await expect(diaryPage.mealHeader('Lunch')).toContainText('100 calories')
      await expect(diaryPage.mealHeader('Breakfast')).toContainText('300 calories')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(rice)
        await api.deleteDiaryEntriesByFoodName(chicken)
      })
    }
  })
})
