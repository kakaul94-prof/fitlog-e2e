import { expect } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

/** Meal keys as the app uses them in routes and button labels. */
export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snacks'

/**
 * The "Add to {meal}" screen (/diary/add): food library search, USDA search,
 * quick add, new-food entry, and the serving sheet that logs a picked food.
 */
export class FoodPickerPage extends BasePage {
  protected readonly path = '/diary/add'

  readonly searchInput = this.page.getByPlaceholder('Search your foods')
  readonly newFoodButton = this.page.getByRole('button', { name: 'New food' })
  readonly quickAddButton = this.page.getByRole('button', { name: 'Quick add' })
  readonly doneButton = this.page.getByRole('button', { name: 'Done', exact: true })

  // --- serving sheet (opens after tapping a food) ---
  // exact: the +/− buttons are labeled "Decrease/Increase servings".
  readonly servingsInput = this.page.getByLabel('Servings', { exact: true })
  readonly editFoodDetailsButton = this.page.getByRole('button', {
    name: 'Edit food details',
  })

  // --- USDA section ---
  readonly searchUsdaButton = this.page.getByRole('button', { name: /^Search USDA for/ })
  /** Inline error paragraph (USDA failures render here; no role — see README). */
  readonly errorText = this.page.locator('p.text-destructive')
  // Result buttons live in the block whose direct child is the "USDA database"
  // caption; the `>` keeps ancestor divs from matching too.
  readonly usdaResults = this.page.locator(
    'div:has(> div:text-is("USDA database")) button',
  )

  async gotoFor(date: string, meal: MealKey): Promise<void> {
    await this.page.goto(`/diary/add?date=${date}&meal=${meal}`)
  }

  heading(meal: MealKey) {
    return this.page.getByRole('heading', { name: `Add to ${meal}`, level: 1 })
  }

  /**
   * A library-food row: its accessible name is "{name} {kcal} calories · …".
   * Anchored so it can't match the "Search USDA for "{name}"" button, which
   * appears (instantly) as soon as the search box has text.
   */
  foodRow(name: string) {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(name)} \\d+ calories`),
    })
  }

  addToMealButton(meal: MealKey) {
    return this.page.getByRole('button', { name: `Add to ${meal}`, exact: true })
  }

  /** Search the library and open a food's serving sheet. */
  async searchAndOpen(name: string): Promise<void> {
    await this.searchInput.fill(name)
    await this.foodRow(name).click()
    await expect(this.servingsInput).toBeVisible()
  }

  /** With the serving sheet open: set servings and log to the meal. */
  async logServings(meal: MealKey, servings: number): Promise<void> {
    // Scoped .first(): tray rows behind the sheet also carry "Servings".
    await this.servingsInput.first().fill(String(servings))
    await this.addToMealButton(meal).click()
  }

  /** The sheet's amount-unit dropdown (renders when a food has extra units). */
  readonly servingUnitSelect = this.page.getByLabel('Serving unit')

  /** With the sheet open: pick a unit (by id, e.g. 'g'), set the amount, log. */
  async logAmountInUnit(meal: MealKey, unitId: string, amount: number): Promise<void> {
    await this.servingUnitSelect.selectOption(unitId)
    await this.servingsInput.first().fill(String(amount))
    await this.addToMealButton(meal).click()
  }

  // --- the just-added tray (footer of the picker after logging) ---
  /** The tray footer toggle — "{n} added · {kcal} cal". */
  readonly trayToggle = this.page.getByRole('button', { name: /added · \d+ cal/ })

  /** A tray row, scoped via its food-name text. */
  private trayRow(name: string) {
    return this.page.getByText(name, { exact: true }).locator('..').locator('..')
  }

  async openTray(): Promise<void> {
    await this.trayToggle.click()
  }

  /** Edit a just-added entry's servings from its tray row (writes through). */
  async setTrayServings(name: string, servings: number): Promise<void> {
    // exact — "Decrease/Increase servings" buttons substring-match otherwise.
    const input = this.trayRow(name).getByLabel('Servings', { exact: true })
    await input.fill(String(servings))
    await input.blur()
  }

  /** Remove a just-added entry from its tray row (deletes the diary row). */
  async removeTrayEntry(name: string): Promise<void> {
    await this.trayRow(name).getByRole('button', { name: 'Remove entry' }).click()
  }

  /** Multi-add bottom bar state after returning from "New food". */
  readonly pickedSummary = this.page.getByText(/foods? selected$/)
  readonly multiAddToggle = this.page.getByRole('button', { name: 'Multi-add' })

  /** In multi-add mode: search and toggle-select each food (picks persist). */
  async multiSelect(names: string[]): Promise<void> {
    for (const name of names) {
      await this.searchInput.fill(name)
      await this.foodRow(name).click()
    }
  }

  addPickedButton(count: number, meal: MealKey) {
    return this.page.getByRole('button', { name: `Add ${count} to ${meal}` })
  }

  /** "New food" → "Enter manually" (skipping the source popup's USDA/scan paths). */
  async openNewFoodForm(): Promise<void> {
    await this.newFoodButton.click()
    await expect(this.page.getByText('Start from a source')).toBeVisible()
    await this.page.getByRole('button', { name: 'Enter manually' }).click()
  }

  /** Log a bare calorie count via the Quick add sheet. */
  async quickAdd(meal: MealKey, name: string, kcal: number): Promise<void> {
    await this.quickAddButton.click()
    await this.page.getByLabel('Name (optional)').fill(name)
    await this.page.getByLabel('Calories', { exact: true }).fill(String(kcal))
    await this.addToMealButton(meal).click()
  }

  /** Tap Done on the running-tally bar to return to the diary. */
  async finish(): Promise<void> {
    await this.doneButton.click()
  }

  /** A saved-meal row on the Meals tab — "{name} {n} items · {kcal} calories". */
  savedMealRow(name: string) {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(name)} \\d+ items?`),
    })
  }

  /** Switch to the saved-meals tab. */
  async openMealsTab(): Promise<void> {
    await this.page.getByRole('button', { name: 'meals', exact: true }).click()
  }

  /** Press-and-hold a library food row to open its menu (450ms threshold). */
  async longPressFood(name: string): Promise<void> {
    await this.foodRow(name).hover()
    await this.page.mouse.down()
    // Fixed interaction duration, not a wait-for-state.
    await this.page.waitForTimeout(700)
    await this.page.mouse.up()
  }

  /** From the long-press menu: delete the food from the library. */
  async deleteFoodFromMenu(): Promise<void> {
    await this.page.getByRole('button', { name: 'Delete food' }).click()
  }

  /**
   * "Copy day": pull the previous day's entries for this meal into the
   * current day (the sheet defaults its source date to yesterday).
   */
  async copyPreviousDay(expectedCount: number): Promise<void> {
    await this.page.getByRole('button', { name: 'Copy day' }).click()
    await this.page
      .getByRole('button', {
        name: new RegExp(`^Copy ${expectedCount} items?$`),
      })
      .click()
  }

  /** With the Meals tab open: meal row → confirm sheet. */
  async logSavedMeal(name: string, itemCount: number, meal: MealKey): Promise<void> {
    await this.savedMealRow(name).click()
    await this.page
      .getByRole('button', { name: `Add ${itemCount} to ${meal}` })
      .click()
  }
}
