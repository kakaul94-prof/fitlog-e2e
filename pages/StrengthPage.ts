import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/** The Exercise tab (/strength): workout history + the start-workout menu. */
export class StrengthPage extends BasePage {
  protected readonly path = '/strength'

  readonly heading = this.page.getByRole('heading', { name: 'Exercise', level: 1 })
  readonly addButton = this.page.getByRole('button', { name: 'Add', exact: true })

  /** "+" → "Empty workout" → lands on the new workout's page. */
  async startEmptyWorkout(): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.addButton.click()
    await this.page.getByRole('button', { name: 'Empty workout' }).click()
    await expect(
      this.page.getByRole('heading', { name: 'Workout', level: 1 }),
    ).toBeVisible()
  }
}
