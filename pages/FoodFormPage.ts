import type { Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * The food create/edit form (/foods/new, /foods/:id): details, per-serving
 * nutrition, and the serving-size auto-rescale (blur the serving-size field).
 */
export class FoodFormPage extends BasePage {
  protected readonly path = '/foods/new'

  readonly addHeading = this.page.getByRole('heading', { name: 'Add food', level: 1 })
  readonly editHeading = this.page.getByRole('heading', { name: 'Edit food', level: 1 })
  readonly nameInput = this.page.getByLabel('Name', { exact: true })
  readonly brandInput = this.page.getByLabel('Brand (optional)')
  readonly servingSizeInput = this.page.getByLabel('Serving size')
  readonly servingUnitInput = this.page.getByLabel('Unit', { exact: true })
  readonly saveButton = this.page.getByRole('button', { name: 'Save to my foods' })

  /**
   * A nutrient field by its visible label (Calories, Protein, Carbs, Fat…).
   * The app renders these labels without htmlFor, so target the input that
   * immediately follows the label element (see README → future work).
   */
  nutrient(label: string): Locator {
    return this.page.locator(`label:text-is("${label}") + input`)
  }

  async fillNutrients(values: Record<string, number>): Promise<void> {
    for (const [label, value] of Object.entries(values)) {
      await this.nutrient(label).fill(String(value))
    }
  }

  /** Change the serving size and blur, which rescales all nutrient fields. */
  async rescaleServingSize(qty: number): Promise<void> {
    await this.servingSizeInput.fill(String(qty))
    await this.servingSizeInput.blur()
  }
}
