import { test, expect } from '../fixtures/test-options'
import { addDaysISO, uniqueName, uniquePastDate } from '../utils/test-data'

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
      await expect(diaryPage.mealHeaderKcal('Lunch', 100)).toBeVisible()
      await expect(diaryPage.mealHeaderKcal('Breakfast', 300)).toBeVisible()

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
      await expect(diaryPage.mealHeaderKcal('Lunch', 100)).toBeVisible()
      await expect(diaryPage.mealHeaderKcal('Breakfast', 300)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(rice)
        await api.deleteDiaryEntriesByFoodName(chicken)
      })
    }
  })

  test('previous/next day navigation swaps the visible entries', async ({
    diaryPage,
    api,
  }) => {
    const dayOneFood = uniqueName('Oats')
    const dayTwoFood = uniqueName('Soup')
    const dayOne = uniquePastDate()
    const dayTwo = addDaysISO(dayOne, 1)

    await api.createDiaryEntry({ date: dayOne, meal: 'breakfast', name: dayOneFood, kcal: 100 })
    await api.createDiaryEntry({ date: dayTwo, meal: 'breakfast', name: dayTwoFood, kcal: 200 })
    try {
      await diaryPage.gotoDate(dayOne)
      await expect(diaryPage.entryRow(dayOneFood)).toBeVisible()

      await diaryPage.nextDayButton.click()
      await expect(diaryPage.entryRow(dayTwoFood)).toBeVisible()
      await expect(diaryPage.entryRow(dayOneFood)).toBeHidden()

      await diaryPage.previousDayButton.click()
      await expect(diaryPage.entryRow(dayOneFood)).toBeVisible()
      await expect(diaryPage.entryRow(dayTwoFood)).toBeHidden()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(dayOneFood)
        await api.deleteDiaryEntriesByFoodName(dayTwoFood)
      })
    }
  })

  test('bulk-deletes selected entries', async ({ diaryPage, api }) => {
    const first = uniqueName('Bar')
    const second = uniqueName('Shake')
    const date = uniquePastDate()

    await api.createDiaryEntry({ date, meal: 'breakfast', name: first, kcal: 150 })
    await api.createDiaryEntry({ date, meal: 'breakfast', name: second, kcal: 250 })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.longPressEntry(first)
      await diaryPage.enterSelectMode()
      await diaryPage.entryRow(second).click()
      await expect(diaryPage.selectionCount(2)).toBeVisible()

      await diaryPage.deleteSelection()
      await expect(diaryPage.entryRow(first)).toBeHidden()
      await expect(diaryPage.entryRow(second)).toBeHidden()
      await expect(diaryPage.emptyMealRow('Breakfast')).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(first)
        await api.deleteDiaryEntriesByFoodName(second)
      })
    }
  })

  test('copies the previous day\'s meal in from the picker', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const eggs = uniqueName('Eggs')
    const toast = uniqueName('Toast')
    const sourceDate = uniquePastDate()
    // The picker's "Copy day" sheet defaults its source to the previous day.
    const targetDate = addDaysISO(sourceDate, 1)

    await api.createDiaryEntry({ date: sourceDate, meal: 'breakfast', name: eggs, kcal: 150 })
    await api.createDiaryEntry({ date: sourceDate, meal: 'breakfast', name: toast, kcal: 250 })
    try {
      await foodPickerPage.gotoFor(targetDate, 'breakfast')
      await foodPickerPage.copyPreviousDay(2)

      // Copying navigates back to the target day's diary.
      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRow(eggs)).toBeVisible()
      await expect(diaryPage.entryRow(toast)).toBeVisible()
      await expect(diaryPage.mealHeaderKcal('Breakfast', 400)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(eggs)
        await api.deleteDiaryEntriesByFoodName(toast)
      })
    }
  })
})

