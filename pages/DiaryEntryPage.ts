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

  /** Change the meal (commits immediately) and wait for the server state. */
  async setMeal(meal: string): Promise<void> {
    await this.mealSelect.selectOption(meal)
    // The select is bound to the fetched entry — once it reflects the new
    // meal, the refetch (which re-syncs the servings field) has settled.
    await expect(this.mealSelect).toHaveValue(meal)
  }

  /**
   * Servings edits are local until saved: the "Save changes" button appears
   * once dirty, saves, and navigates back to the diary.
   */
  async setServingsAndSave(servings: number): Promise<void> {
    await this.servingsInput.fill(String(servings))
    await this.page.getByRole('button', { name: 'Save changes' }).click()
  }

  /** Delete the entry, accepting the browser confirm() dialog. */
  async deleteEntry(): Promise<void> {
    this.page.once('dialog', (dialog) => void dialog.accept())
    await this.deleteButton.click()
  }
}
