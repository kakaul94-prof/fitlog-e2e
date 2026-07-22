import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * The workout-template editor (/routines/new, /routines/:id): name, exercises
 * with target sets/reps, saved explicitly via "Save template".
 */
export class RoutinePage extends BasePage {
  protected readonly path = '/routines/new'

  readonly newHeading = this.page.getByRole('heading', { name: 'New template', level: 1 })
  readonly editHeading = this.page.getByRole('heading', { name: 'Edit template', level: 1 })
  // Label isn't associated with the input — target the adjacent element.
  readonly nameInput = this.page.locator('label:text-is("Template name") + input')
  readonly addExerciseButton = this.page.getByRole('button', { name: 'Add exercise' })
  readonly targetSetsInput = this.page.getByPlaceholder('sets')
  readonly targetRepsInput = this.page.getByPlaceholder('reps')
  readonly saveButton = this.page.getByRole('button', { name: 'Save template' })
  readonly backButton = this.page.locator('header').getByRole('button').first()

  /** Add a brand-new custom exercise to the template (keeps tests isolated). */
  async addCustomExercise(name: string): Promise<void> {
    await this.addExerciseButton.click()
    await this.page.getByRole('button', { name: 'New custom exercise' }).click()
    await this.page.getByLabel('Name', { exact: true }).fill(name)
    await this.page.getByRole('button', { name: 'Add to template' }).click()
    await expect(this.page.getByText(name)).toBeVisible()
  }

  /** Set the (single) exercise's target sets/reps — committed on blur. */
  async setTargets(sets: number, reps: number): Promise<void> {
    await this.targetSetsInput.fill(String(sets))
    await this.targetSetsInput.blur()
    await this.targetRepsInput.fill(String(reps))
    await this.targetRepsInput.blur()
  }
}
