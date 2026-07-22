import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

/**
 * A live workout (/workout/:id): exercise cards with set rows (lb/reps commit
 * on blur), per-exercise e1RM, and the done/exit flows.
 */
export class WorkoutPage extends BasePage {
  protected readonly path = '/strength'

  readonly heading = this.page.getByRole('heading', { name: 'Workout', level: 1 })
  readonly addExerciseButton = this.page.getByRole('button', { name: 'Add exercise' })
  readonly addSetButton = this.page.getByRole('button', { name: '+ Add set' })
  readonly markDoneButton = this.page.getByRole('button', { name: 'Mark as done' })
  readonly backButton = this.page.locator('header').getByRole('button').first()
  // One row per set — the only per-row control with an accessible name.
  readonly setRows = this.page.getByRole('button', { name: 'Delete set' })

  exerciseTitle(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true })
  }

  e1rm(value: number): Locator {
    return this.page.getByText(`e1RM ${value}`)
  }

  /**
   * Fill one set's lb + reps (1-based index). The inputs carry no labels
   * (README → future work): each set row contributes [weight, reps] to the
   * page's spinbuttons in order, with the RPE dropdown being a combobox.
   */
  async logSet(setIndex: number, weightLb: number, reps: number): Promise<void> {
    const weightInput = this.page.getByRole('spinbutton').nth((setIndex - 1) * 2)
    const repsInput = this.page.getByRole('spinbutton').nth((setIndex - 1) * 2 + 1)
    await weightInput.fill(String(weightLb))
    await weightInput.blur()
    await repsInput.fill(String(reps))
    await repsInput.blur()
  }

  /** Add a new exercise via the picker's inline custom-exercise form. */
  async addCustomExercise(name: string): Promise<void> {
    await this.addExerciseButton.click()
    await this.page.getByRole('button', { name: 'New custom exercise' }).click()
    await this.page.getByLabel('Name', { exact: true }).fill(name)
    await this.page.getByRole('button', { name: 'Add to workout' }).click()
    await expect(this.exerciseTitle(name)).toBeVisible()
  }

  /** Add an existing exercise by searching the picker list. */
  async addExistingExercise(name: string): Promise<void> {
    await this.addExerciseButton.click()
    await this.page.getByPlaceholder('Search exercises or muscle').fill(name)
    await this.page
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}`) })
      .click()
    await expect(this.exerciseTitle(name)).toBeVisible()
  }

  // --- supersets ---
  /** The standalone card's "Superset" link button (hidden for members). */
  readonly supersetButton = this.page.getByRole('button', { name: 'Superset' })
  /** The superset block's label (the button disappears once linked). */
  readonly supersetBlockLabel = this.page.getByText('Superset', { exact: true })
  /** The block's shared Done control (members hide their own timing rows). */
  readonly blockDoneButton = this.page.getByRole('button', { name: 'Done', exact: true })
  readonly completedSection = this.page.getByRole('button', { name: /^Completed \(\d+\)/ })

  /** Link a new custom exercise as a superset partner of the current one. */
  async addSupersetCustomExercise(name: string): Promise<void> {
    await this.supersetButton.click()
    await expect(
      this.page.getByRole('heading', { name: 'Add superset exercise', level: 1 }),
    ).toBeVisible()
    await this.page.getByRole('button', { name: 'New custom exercise' }).click()
    await this.page.getByLabel('Name', { exact: true }).fill(name)
    await this.page.getByRole('button', { name: 'Add to workout' }).click()
    await expect(this.exerciseTitle(name)).toBeVisible()
  }
}
