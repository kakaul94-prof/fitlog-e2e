import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/** Profile & Goals (/profile): calorie-goal mode + manual target. */
export class ProfilePage extends BasePage {
  protected readonly path = '/profile'

  readonly heading = this.page.getByRole('heading', {
    name: 'Profile & Goals',
    level: 1,
  })
  readonly manualGoalCheckbox = this.page.getByRole('checkbox', {
    name: 'Set my calorie target manually',
  })
  readonly manualTargetInput = this.page.getByLabel('Manual calorie target')
  readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true })
  readonly savedIndicator = this.page.getByRole('button', { name: 'Saved ✓' })

  /**
   * The form populates async from the profile row; wait until the checkbox
   * reflects the known stored mode before editing, or the load would
   * overwrite the changes.
   */
  async expectLoaded(storedModeIsManual: boolean): Promise<void> {
    await expect(this.heading).toBeVisible()
    await expect(this.manualGoalCheckbox).toBeChecked({ checked: storedModeIsManual })
  }

  async setManualCalorieGoal(target: number): Promise<void> {
    await this.manualGoalCheckbox.check()
    await this.manualTargetInput.fill(String(target))
    await this.saveButton.click()
    await expect(this.savedIndicator).toBeVisible()
  }
}
