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
  readonly activitySearch = this.page.getByLabel('Activity')

  /**
   * Create and pick a custom activity (name + MET). The inline form has its
   * own "Name" field, so scope through the card titled "New custom activity".
   */
  async createCustomActivity(name: string, met: number): Promise<void> {
    await this.activitySearch.click()
    await this.page.getByRole('button', { name: 'New custom activity' }).click()
    const card = this.page.getByText('New custom activity', { exact: true }).locator('..')
    await card.getByLabel('Name', { exact: true }).fill(name)
    await card.getByLabel('Intensity (MET)').fill(String(met))
    await this.page.getByRole('button', { name: 'Add activity' }).click()
    // Wait for the form to close — while it's open the page has two
    // "Name"-labeled inputs, and picking only happens once it closes.
    await expect(this.page.getByText('New custom activity')).toBeHidden()
    await expect(this.nameInput).toHaveValue(name)
  }

  /** Log using the MET estimate (no calorie override). */
  async logEstimated(minutes: number): Promise<void> {
    await this.durationInput.fill(String(minutes))
    await this.saveButton.click()
  }

  // --- edit mode (/exercise/edit/:id) ---
  readonly editHeading = this.page.getByRole('heading', { name: 'Edit exercise', level: 1 })
  readonly saveChangesButton = this.page.getByRole('button', { name: 'Save changes' })

  /** Wait for the edit form's async prefill before touching any field. */
  async expectEditLoaded(minutes: number): Promise<void> {
    await expect(this.editHeading).toBeVisible()
    await expect(this.durationInput).toHaveValue(String(minutes))
  }

  /** Log a cardio session under a free-typed name with exact calories. */
  async logCardio(name: string, minutes: number, calories: number): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.nameInput.fill(name)
    await this.durationInput.fill(String(minutes))
    await this.caloriesOverrideInput.fill(String(calories))
    await this.saveButton.click()
  }
}
