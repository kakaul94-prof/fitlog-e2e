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

  /** A row's displayed date (ISO string shown on its date button). */
  measurementDate(date: string): Locator {
    return this.page.getByText(date, { exact: true })
  }

  /** A history row, located through its unique value text. */
  private measurementRow(value: number) {
    return this.measurementValue(value).locator('..')
  }

  /** Change a history row's date via its (visually hidden) date input. */
  async changeRowDate(value: number, newDate: string): Promise<void> {
    await this.measurementRow(value).locator('input[type="date"]').fill(newDate)
  }

  /** Delete a history row (the ✕ button carries aria-label "Delete"). */
  async deleteRow(value: number): Promise<void> {
    await this.measurementRow(value).getByRole('button', { name: 'Delete' }).click()
  }
}
