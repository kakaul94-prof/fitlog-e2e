import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * A logged diary entry's detail page (/diary/entry/:id): servings (blur
 * commit), meal select, nutrition panel, and delete (native confirm dialog).
 */
export class DiaryEntryPage extends BasePage {
  protected readonly path = '/'

  readonly servingsInput = this.page.getByLabel('Servings', { exact: true })
  // The only select on the page; its "Meal" label isn't associated.
  readonly mealSelect = this.page.getByRole('combobox')
  readonly deleteButton = this.page.getByRole('button', { name: 'Delete entry' })
  readonly backButton = this.page.locator('header').getByRole('button').first()

  heading(foodName: string): Locator {
    return this.page.getByRole('heading', { name: foodName, level: 1 })
  }

  /** Wait for the entry to load (the form populates async). */
  async expectLoaded(foodName: string, servings: number): Promise<void> {
    await expect(this.heading(foodName)).toBeVisible()
    await expect(this.servingsInput).toHaveValue(String(servings))
  }

  async setServings(servings: number): Promise<void> {
    await this.servingsInput.fill(String(servings))
    await this.servingsInput.blur()
  }

  async setMeal(meal: string): Promise<void> {
    await this.mealSelect.selectOption(meal)
  }

  /** Delete the entry, accepting the browser confirm() dialog. */
  async deleteEntry(): Promise<void> {
    this.page.once('dialog', (dialog) => void dialog.accept())
    await this.deleteButton.click()
  }
}
