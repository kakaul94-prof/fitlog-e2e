import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

/** The Progress tab (/progress) — Body view: log weight + history list. */
export class ProgressPage extends BasePage {
  protected readonly path = '/progress'

  readonly heading = this.page.getByRole('heading', { name: 'Progress', level: 1 })
  // The label isn't associated with the input — target the adjacent element.
  readonly weightInput = this.page.locator('label:text-is("Log weight (lb)") + input')
  readonly addButton = this.page.getByRole('button', { name: 'Add', exact: true })

  /** A history-list entry, e.g. "137.42 lb". */
  measurementValue(value: number): Locator {
    return this.page.getByText(`${value} lb`)
  }

  async logWeight(value: number): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.weightInput.fill(String(value))
    await this.addButton.click()
  }
}
