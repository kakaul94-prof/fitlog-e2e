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

  /** "+" → "Template" → the template editor. */
  async openNewTemplate(): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.addButton.click()
    await this.page.getByRole('button', { name: 'Template', exact: true }).click()
  }

  /** Open a template's editor from the Templates list. */
  async openRoutine(name: string): Promise<void> {
    await this.page.getByRole('link', { name, exact: true }).click()
  }

  /** Start a workout from a template row in the Templates list. */
  async startRoutine(name: string): Promise<void> {
    await this.page
      .getByRole('link', { name, exact: true })
      .locator('..')
      .getByRole('button', { name: 'Start' })
      .click()
    // The workout inherits the routine's name as its title.
    await expect(this.page.getByRole('heading', { name, level: 1 })).toBeVisible()
  }
}
