import { randomUUID } from 'node:crypto'
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
      await expect(diaryPage.entryRowKcal(recipeName, perServingKcal)).toBeVisible()
      await expect(diaryPage.mealHeaderKcal('Lunch', perServingKcal)).toBeVisible()
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
      await expect(diaryPage.entryRowKcal(recipeName, 250)).toBeVisible()
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(recipeName)
        await api.deleteFoodsByName(recipeName)
        await api.deleteFoodsByName(riceName)
        await api.deleteFoodsByName(chickenName)
      })
    }
  })

  test('converts ingredient amounts through alternate units', async ({
    libraryPage,
    recipeEditPage,
    api,
  }) => {
    const foodName = uniqueName('Oats')
    const recipeName = uniqueName('Porridge')

    // 100 kcal per 100 g serving, with a "cup" unit weighing 150 g → 150 kcal.
    await api.createFood(
      foodName,
      { kcal: 100 },
      {
        servingGrams: 100,
        portions: [{ id: randomUUID(), label: 'cup', grams: 150 }],
      },
    )
    try {
      await libraryPage.createRecipe()
      await recipeEditPage.expectNewRecipeLoaded()
      await recipeEditPage.setName(recipeName)
      await recipeEditPage.addIngredient(foodName)
      await expect(recipeEditPage.ingredientRow(foodName)).toContainText('100 calories')

      await recipeEditPage.setIngredientUnit(foodName, 'cup')
      await expect(recipeEditPage.ingredientRow(foodName)).toContainText('150 calories')
      // The stored per-serving nutrition recomputes with the conversion.
      await expect
        .poll(() => api.getFoodKcalByName(recipeName), { timeout: 10_000 })
        .toBe(150)
    } finally {
      await api.bestEffort(async () => {
        await api.deleteFoodsByName(recipeName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })

  test('duplicates a recipe with its ingredients and nutrition', async ({
    libraryPage,
    recipeEditPage,
    api,
  }) => {
    const riceName = uniqueName('Rice')
    const recipeName = uniqueName('Pilaf')
    const copyName = `${recipeName} (copy)`

    await api.createFood(riceName, SEED_FOODS.rice)
    try {
      await libraryPage.createRecipe()
      await recipeEditPage.expectNewRecipeLoaded()
      await recipeEditPage.setName(recipeName)
      await recipeEditPage.addIngredient(riceName)
      await expect
        .poll(() => api.getFoodKcalByName(recipeName), { timeout: 10_000 })
        .toBe(SEED_FOODS.rice.kcal)

      // "Save as a copy" opens the duplicate's editor.
      await recipeEditPage.duplicateButton.click()
      await expect(recipeEditPage.nameInput).toHaveValue(copyName)
      await expect(recipeEditPage.ingredientRow(riceName)).toBeVisible()
      await expect
        .poll(() => api.getFoodKcalByName(copyName), { timeout: 10_000 })
        .toBe(SEED_FOODS.rice.kcal)
    } finally {
      await api.bestEffort(async () => {
        await api.deleteFoodsByName(copyName)
        await api.deleteFoodsByName(recipeName)
        await api.deleteFoodsByName(riceName)
      })
    }
  })
})
