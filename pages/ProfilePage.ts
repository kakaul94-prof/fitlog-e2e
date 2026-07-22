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

  /**
   * A macro row's controls (Protein / Fat / Carbs). The row's select and
   * value input carry no accessible names (README → future work): walk up
   * from the row's label to its container.
   */
  private macroRow(label: 'Protein' | 'Fat' | 'Carbs') {
    return this.page.locator(`label:text-is("${label}")`).locator('..').locator('..')
  }

  /** Set a macro's mode (by visible option label) and value, without saving. */
  async setMacroTarget(
    label: 'Protein' | 'Fat' | 'Carbs',
    modeLabel: string,
    value: number,
  ): Promise<void> {
    const row = this.macroRow(label)
    await row.getByRole('combobox').selectOption({ label: modeLabel })
    await row.getByRole('spinbutton').fill(String(value))
  }

  async save(): Promise<void> {
    await this.saveButton.click()
    await expect(this.savedIndicator).toBeVisible()
  }
}
