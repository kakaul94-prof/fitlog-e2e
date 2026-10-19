import { expect } from '@playwright/test'
import { BasePage } from './BasePage'
import { CheckinSheet } from './components/CheckinSheet'

/** The Exercise tab (/strength): workout history + the start-workout menu. */
export class StrengthPage extends BasePage {
  protected readonly path = '/strength'

  readonly heading = this.page.getByRole('heading', { name: 'Exercise', level: 1 })
  readonly addButton = this.page.getByRole('button', { name: 'Add', exact: true })
  readonly checkin = new CheckinSheet(this.page)

  /** "+" → "Empty workout" → (check-in) → the new workout's page. */
  async startEmptyWorkout(): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.addButton.click()
    // exact — the rotation hero's empty state offers "Start empty workout",
    // which substring-matches otherwise.
    await this.page.getByRole('button', { name: 'Empty workout', exact: true }).click()
    await this.checkin.skipIfShown(this.page.getByRole('heading', { name: 'Workout', level: 1 }))
  }

  /** The Templates hub page (templates moved off the main strength tab). */
  private readonly templatesHeading = this.page.getByRole('heading', {
    name: 'Templates',
    level: 1,
  })

  /** Land on /lift/templates from wherever we are (no-op if already there). */
  async gotoTemplates(): Promise<void> {
    await expect(this.heading.or(this.templatesHeading)).toBeVisible()
    if (await this.templatesHeading.isVisible()) return
    await this.page.getByRole('button', { name: 'Templates', exact: true }).click()
    await expect(this.templatesHeading).toBeVisible()
  }

  /** Templates hub → "+" (aria "New template") → the template editor. */
  async openNewTemplate(): Promise<void> {
    await this.gotoTemplates()
    await this.page.getByRole('button', { name: 'New template' }).click()
  }

  /** Open a template's editor from the Templates hub. */
  async openRoutine(name: string): Promise<void> {
    await this.gotoTemplates()
    await this.page.getByRole('link', { name, exact: true }).click()
  }

  /** Start a workout from a template row on the Templates hub. */
  async startRoutine(name: string): Promise<void> {
    await this.gotoTemplates()
    await this.page
      .getByRole('link', { name, exact: true })
      .locator('..')
      .getByRole('button', { name: 'Start' })
      .click()
    // The workout inherits the routine's name as its title.
    await this.checkin.skipIfShown(this.page.getByRole('heading', { name, level: 1 }))
  }
}
