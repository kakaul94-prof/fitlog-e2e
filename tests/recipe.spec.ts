import { test, expect } from '../fixtures/test-options'
import { SEED_FOODS } from '../data/test-data'
import { uniqueName, uniquePastDate } from '../utils/test-data'

test.describe('recipes', () => {
  test('builds a recipe from ingredients, computes per-serving, and logs it', async ({
    diaryPage,
    foodPickerPage,
    libraryPage,
    recipeEditPage,
    api,
  }) => {
    const riceName = uniqueName('Rice')
    const chickenName = uniqueName('Chicken')
    const recipeName = uniqueName('Bowl')
    const date = uniquePastDate()
    // (100 + 300) kcal across 2 servings → 200 per serving.
    const perServingKcal =
      (SEED_FOODS.rice.kcal + SEED_FOODS.chicken.kcal) / 2

    await api.createFood(riceName, SEED_FOODS.rice)
    await api.createFood(chickenName, SEED_FOODS.chicken)
    try {
      await libraryPage.createRecipe()
      await recipeEditPage.expectNewRecipeLoaded()
      await recipeEditPage.setName(recipeName)

      await recipeEditPage.addIngredient(riceName)
      await expect(recipeEditPage.ingredientRow(riceName)).toContainText(
        `${SEED_FOODS.rice.kcal} calories`,
      )
      await recipeEditPage.addIngredient(chickenName)
      await expect(recipeEditPage.ingredientRow(chickenName)).toContainText(
        `${SEED_FOODS.chicken.kcal} calories`,
      )

      await recipeEditPage.setYield(2)
      await expect(recipeEditPage.perServingHeading(2)).toBeVisible()

      // Recipes are foods: log one serving to the diary like any other food.
      await foodPickerPage.gotoFor(date, 'lunch')
      await foodPickerPage.searchAndOpen(recipeName)
      await foodPickerPage.logServings('lunch', 1)
      await foodPickerPage.finish()

      await diaryPage.expectLoaded()
      const entry = diaryPage.entryRow(recipeName)
      await expect(entry).toBeVisible()
      await expect(entry).toContainText(`${perServingKcal} calories`)
      await expect(diaryPage.mealHeader('Lunch')).toContainText(
        `${perServingKcal} calories`,
      )
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(recipeName)
        // The recipe row must go first — it releases the FK restriction on
        // its ingredient foods.
        await api.deleteFoodsByName(recipeName)
        await api.deleteFoodsByName(riceName)
        await api.deleteFoodsByName(chickenName)
      })
    }
  })

  test('recomputes per-serving nutrition when an ingredient amount changes', async ({
    diaryPage,
    foodPickerPage,
    libraryPage,
    recipeEditPage,
    api,
  }) => {
    const riceName = uniqueName('Rice')
    const chickenName = uniqueName('Chicken')
    const recipeName = uniqueName('Bowl')
    const date = uniquePastDate()

    await api.createFood(riceName, SEED_FOODS.rice)
    await api.createFood(chickenName, SEED_FOODS.chicken)
    try {
      await libraryPage.createRecipe()
      await recipeEditPage.expectNewRecipeLoaded()
      await recipeEditPage.setName(recipeName)
      await recipeEditPage.addIngredient(riceName)
      await recipeEditPage.addIngredient(chickenName)
      await recipeEditPage.setYield(2)
      await expect(recipeEditPage.perServingHeading(2)).toBeVisible()

      // Double the rice: its row rescales, and the stored per-serving
      // nutrition recomputes to (200 + 300) / 2 = 250.
      await recipeEditPage.setIngredientAmount(riceName, 2)
      await expect(recipeEditPage.ingredientRow(riceName)).toContainText('200 calories')
      // The row above renders local state — wait for the server-side
      // recompute to land on the stored food row before logging it.
      await expect
        .poll(() => api.getFoodKcalByName(recipeName), { timeout: 10_000 })
        .toBe(250)

      await foodPickerPage.gotoFor(date, 'dinner')
      await foodPickerPage.searchAndOpen(recipeName)
      await foodPickerPage.logServings('dinner', 1)
      await foodPickerPage.finish()

      await diaryPage.expectLoaded()
      await expect(diaryPage.entryRow(recipeName)).toContainText('250 calories')
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(recipeName)
        await api.deleteFoodsByName(recipeName)
        await api.deleteFoodsByName(riceName)
        await api.deleteFoodsByName(chickenName)
      })
    }
  })
})
