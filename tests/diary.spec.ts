import { test, expect } from '../fixtures/test-options'
import { SEED_FOODS, scaledKcal } from '../data/test-data'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('food diary', () => {
  test('logs a library food and updates the day totals', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const foodName = uniqueName('Oats')
    const date = uniquePastDate() // empty day → totals are exactly this entry
    const servings = 2
    const expectedKcal = scaledKcal(SEED_FOODS.oats, servings) // 246

    await api.createFood(foodName, SEED_FOODS.oats)
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Breakfast')
      await expect(foodPickerPage.heading('breakfast')).toBeVisible()

      await foodPickerPage.searchAndOpen(foodName)
      await foodPickerPage.logServings('breakfast', servings)
      await foodPickerPage.finish()

      // Entry row, meal subtotal, and the day's consumed-calories line.
      await diaryPage.expectLoaded()
      const entry = diaryPage.entryRow(foodName)
      await expect(entry).toBeVisible()
      await expect(entry).toContainText(`${expectedKcal} calories`)
      await expect(diaryPage.mealHeader('Breakfast')).toContainText(
        `${expectedKcal} calories`,
      )
      await expect(diaryPage.foodTotal(expectedKcal)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })

  test('quick-adds calories to today', async ({ diaryPage, foodPickerPage, api }) => {
    const entryName = uniqueName('Takeout')
    const kcal = 111

    try {
      // Today's diary (no date param) — the streak/today flows depend on it.
      await diaryPage.goto()
      await diaryPage.expectLoaded()
      await diaryPage.openAddFood('Snacks')
      await expect(foodPickerPage.heading('snacks')).toBeVisible()

      await foodPickerPage.quickAdd('snacks', entryName, kcal)
      await foodPickerPage.finish()

      const entry = diaryPage.entryRow(entryName)
      await expect(entry).toBeVisible()
      await expect(entry).toContainText(`${kcal} calories`)
      // Food logged today → the 🔥 streak pill shows in the header.
      await expect(diaryPage.streakBadge).toBeVisible()
    } finally {
      await api.bestEffort(() => api.deleteDiaryEntriesByFoodName(entryName))
    }
  })

  test('adds several foods at once with multi-add', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const names = [uniqueName('Eggs'), uniqueName('Toast'), uniqueName('Juice')]
    const kcals = [100, 200, 300]
    const date = uniquePastDate()

    for (let i = 0; i < names.length; i++) {
      await api.createFood(names[i]!, { kcal: kcals[i]! })
    }
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Dinner')
      await foodPickerPage.multiAddToggle.click()
      await foodPickerPage.multiSelect(names)

      await expect(foodPickerPage.pickedSummary).toHaveText('3 foods selected')
      await foodPickerPage.addPickedButton(3, 'dinner').click()
      await foodPickerPage.finish()

      await diaryPage.expectLoaded()
      for (let i = 0; i < names.length; i++) {
        await expect(diaryPage.entryRow(names[i]!)).toContainText(`${kcals[i]} calories`)
      }
      await expect(diaryPage.mealHeader('Dinner')).toContainText('600 calories')
    } finally {
      await api.bestEffort(async () => {
        for (const name of names) {
          await api.deleteDiaryEntriesByFoodName(name)
          await api.deleteFoodsByName(name)
        }
      })
    }
  })
})
