import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

/**
 * The recipe editor (/recipes/:id): name + yield (committed on blur),
 * ingredient list, and the computed per-serving nutrition panel.
 */
export class RecipeEditPage extends BasePage {
  protected readonly path = '/recipes'

  readonly heading = this.page.getByRole('heading', { name: 'Edit recipe', level: 1 })
  // Name/Yield labels aren't associated with their inputs (no htmlFor), so
  // target the input right after each label element.
  readonly nameInput = this.page.locator('label:text-is("Name") + input')
  readonly yieldInput = this.page.locator('label:text-is("Yield (servings)") + input')
  readonly addIngredientButton = this.page.getByRole('button', { name: 'Add ingredient' })
  readonly ingredientSearch = this.page.getByPlaceholder('Search your foods')

  /**
   * A freshly created recipe arrives named "New recipe". Wait for that value —
   * the recipe query populates the form async, and anything typed earlier
   * would be overwritten when it lands.
   */
  async expectNewRecipeLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible()
    await expect(this.nameInput).toHaveValue('New recipe')
  }

  /** Field edits commit on blur. */
  async setName(name: string): Promise<void> {
    await this.nameInput.fill(name)
    await this.nameInput.blur()
  }

  async setYield(servings: number): Promise<void> {
    await this.yieldInput.fill(String(servings))
    await this.yieldInput.blur()
  }

  /** An added ingredient's row — name reads "{food} {kcal} calories" (no "·"). */
  ingredientRow(foodName: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(foodName)} \\d+ calories`),
    })
  }

  /** A search-dropdown option — name reads "{food} · {kcal} calories". */
  private ingredientOption(foodName: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(foodName)} · \\d+ calories`),
    })
  }

  /** Open the ingredient search, pick a library food, wait for its row. */
  async addIngredient(foodName: string): Promise<void> {
    await this.addIngredientButton.click()
    await this.ingredientSearch.fill(foodName)
    await this.ingredientOption(foodName).click()
    // The pick inserts + recomputes the recipe server-side; under parallel
    // load that round-trip can exceed the default expect timeout.
    await expect(this.ingredientRow(foodName)).toBeVisible({ timeout: 20_000 })
  }

  /** The "Per serving (makes N)" section heading — confirms the stored yield. */
  perServingHeading(servings: number): Locator {
    return this.page.getByRole('heading', {
      name: `Per serving (makes ${servings})`,
      level: 2,
    })
  }

  /** Change an ingredient's amount (commits on blur; recomputes the recipe). */
  async setIngredientAmount(foodName: string, amount: number): Promise<void> {
    const amountInput = this.ingredientRow(foodName).locator('..').getByLabel('Amount')
    await amountInput.fill(String(amount))
    await amountInput.blur()
  }

  /** Switch an ingredient's unit by visible label (commits immediately). */
  async setIngredientUnit(foodName: string, unitLabel: string): Promise<void> {
    await this.ingredientRow(foodName)
      .locator('..')
      .getByLabel('Unit')
      .selectOption({ label: unitLabel })
  }

  /** Header action: "Save as a copy" (duplicates and opens the copy). */
  readonly duplicateButton = this.page.getByRole('button', { name: 'Save as a copy' })
}
