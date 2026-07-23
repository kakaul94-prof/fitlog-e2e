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
      await expect(diaryPage.entryRowKcal(foodName, expectedKcal)).toBeVisible()
      await expect(diaryPage.mealHeaderKcal('Breakfast', expectedKcal)).toBeVisible()
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

      await expect(diaryPage.entryRowKcal(entryName, kcal)).toBeVisible()
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
        await expect(diaryPage.entryRowKcal(names[i]!, kcals[i]!)).toBeVisible()
      }
      await expect(diaryPage.mealHeaderKcal('Dinner', 600)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        for (const name of names) {
          await api.deleteDiaryEntriesByFoodName(name)
          await api.deleteFoodsByName(name)
        }
      })
    }
  })

  test('logs a food by weight through the serving-unit picker', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const foodName = uniqueName('Rice')
    const date = uniquePastDate()

    // 100 kcal per serving, one serving weighs 100 g → 250 g = 250 kcal.
    await api.createFood(foodName, { kcal: 100 }, { servingGrams: 100 })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Lunch')
      await foodPickerPage.searchAndOpen(foodName)
      await foodPickerPage.logAmountInUnit('lunch', 'g', 250)
      await foodPickerPage.finish()

      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRowKcal(foodName, 250)).toBeVisible()
      await expect(diaryPage.mealHeaderKcal('Lunch', 250)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })

  test('the picker tray tracks edits and removals of just-added entries', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const kept = uniqueName('Oats')
    const removed = uniqueName('Syrup')
    const date = uniquePastDate()

    await api.createFood(kept, { kcal: 100 })
    await api.createFood(removed, { kcal: 300 })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Breakfast')
      await foodPickerPage.searchAndOpen(kept)
      await foodPickerPage.logServings('breakfast', 1)
      await foodPickerPage.searchAndOpen(removed)
      await foodPickerPage.logServings('breakfast', 1)
      await expect(foodPickerPage.trayToggle).toContainText('2 added · 400 cal')

      await foodPickerPage.openTray()
      await foodPickerPage.setTrayServings(kept, 3)
      await expect(foodPickerPage.trayToggle).toContainText('2 added · 600 cal')
      await foodPickerPage.removeTrayEntry(removed)
      await expect(foodPickerPage.trayToggle).toContainText('1 added · 300 cal')
      await foodPickerPage.finish()
      await diaryPage.expectLoaded()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(kept)
        await api.deleteDiaryEntriesByFoodName(removed)
        await api.deleteFoodsByName(kept)
        await api.deleteFoodsByName(removed)
      })
    }
  })

  test('tray edits write through to the stored diary rows', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    // Regression guard for FitLog e728170: the single-add path once
    // regenerated the entry id in onMutate, so tray edits/removals PATCHed
    // and DELETEd a row that didn't exist (204, zero rows matched).
    const kept = uniqueName('Oats')
    const removed = uniqueName('Syrup')
    const date = uniquePastDate()

    await api.createFood(kept, { kcal: 100 })
    await api.createFood(removed, { kcal: 300 })
    try {
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Breakfast')
      await foodPickerPage.searchAndOpen(kept)
      await foodPickerPage.logServings('breakfast', 1)
      await foodPickerPage.searchAndOpen(removed)
      await foodPickerPage.logServings('breakfast', 1)
      // Both inserts committed server-side before editing.
      for (const name of [kept, removed]) {
        await expect
          .poll(async () => {
            const rows = await api.getDiaryEntries({ food_name: `eq.${name}` })
            return rows.length
          })
          .toBe(1)
      }

      await foodPickerPage.openTray()
      await foodPickerPage.setTrayServings(kept, 3)
      await foodPickerPage.removeTrayEntry(removed)

      // Authoritative check on the stored rows (the diary view may serve its
      // persisted cache, so the REST rows are the oracle).
      await expect
        .poll(async () => {
          const rows = await api.getDiaryEntries({ food_name: `eq.${kept}` })
          return rows[0]?.servings
        })
        .toBe(3)
      await expect
        .poll(async () => {
          const rows = await api.getDiaryEntries({ food_name: `eq.${removed}` })
          return rows.length
        })
        .toBe(0)
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(kept)
        await api.deleteDiaryEntriesByFoodName(removed)
        await api.deleteFoodsByName(kept)
        await api.deleteFoodsByName(removed)
      })
    }
  })
})
