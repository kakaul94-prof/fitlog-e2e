import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * The cardio entry form (/exercise/add): activity, duration, and a manual
 * calorie override (used by tests so no body-weight estimate is needed).
 */
export class ExerciseAddPage extends BasePage {
  protected readonly path = '/exercise/add'

  readonly heading = this.page.getByRole('heading', { name: 'Add exercise', level: 1 })
  readonly nameInput = this.page.getByLabel('Name', { exact: true })
  readonly durationInput = this.page.getByLabel('Duration (min)')
  readonly caloriesOverrideInput = this.page.getByLabel(/^Override/)
  readonly saveButton = this.page.getByRole('button', { name: 'Add exercise', exact: true })

  /** Log a cardio session under a free-typed name with exact calories. */
  async logCardio(name: string, minutes: number, calories: number): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.nameInput.fill(name)
    await this.durationInput.fill(String(minutes))
    await this.caloriesOverrideInput.fill(String(calories))
    await this.saveButton.click()
  }
}
