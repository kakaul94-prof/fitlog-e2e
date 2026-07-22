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
  // Set inputs in DOM order: [weight, reps] per row (RPE is a combobox).
  readonly spinbuttons = this.page.getByRole('spinbutton')

  exerciseTitle(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true })
  }

  e1rm(value: number): Locator {
    return this.page.getByText(`e1RM ${value}`)
  }

  /**
   * One set's lb / reps inputs (1-based index). They carry no labels
   * (README → future work): each set row contributes [weight, reps] to the
   * page's spinbuttons in order, with the RPE dropdown being a combobox.
   */
  weightInput(setIndex: number) {
    return this.page.getByRole('spinbutton').nth((setIndex - 1) * 2)
  }

  repsInput(setIndex: number) {
    return this.page.getByRole('spinbutton').nth((setIndex - 1) * 2 + 1)
  }

  async logSet(setIndex: number, weightLb: number, reps: number): Promise<void> {
    await this.weightInput(setIndex).fill(String(weightLb))
    await this.weightInput(setIndex).blur()
    await this.repsInput(setIndex).fill(String(reps))
    await this.repsInput(setIndex).blur()
  }

  /** Back out of an edited in-progress workout, keeping the live-saved edits. */
  async leaveAndSave(): Promise<void> {
    await this.backButton.click()
    await expect(this.page.getByText('Leave workout?')).toBeVisible()
    await this.page.getByRole('button', { name: 'Save & exit' }).click()
  }

  /** Back out, reverting this session's edits to the on-open snapshot. */
  async leaveAndDiscard(): Promise<void> {
    await this.backButton.click()
    await expect(this.page.getByText('Leave workout?')).toBeVisible()
    await this.page.getByRole('button', { name: 'Discard changes' }).click()
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
