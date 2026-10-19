import { expect } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

/**
 * The cardio entry form (/exercise/add, /exercise/edit/:id) — a live calorie
 * summary: name, calories, and duration are tap-to-edit (the duration tile
 * starts open on new entries, closed when editing). New entries open on the
 * activity picker; the name row only appears once an activity is chosen.
 */
export class ExerciseAddPage extends BasePage {
  protected readonly path = '/exercise/add'

  readonly heading = this.page.getByRole('heading', { name: 'Add exercise', level: 1 })
  readonly editHeading = this.page.getByRole('heading', { name: 'Edit exercise', level: 1 })
  readonly saveButton = this.page.getByRole('button', { name: 'Add exercise', exact: true })
  readonly saveChangesButton = this.page.getByRole('button', { name: 'Save changes' })
  readonly activitySearch = this.page.getByPlaceholder('Search activities (e.g. mowing)')

  /** The activity/name row — reads "{name} · {met} MET"; tap to rename. */
  // Anchored on " · ": picker rows also end in "MET" when no weight is logged.
  readonly nameButton = this.page.getByRole('button', { name: / · [\d.]+ MET$/ })
  readonly nameInput = this.page.getByLabel('Exercise name')
  /** The big calorie number — reads "{n} cal"; tap to type an override. */
  readonly caloriesButton = this.page.getByRole('button', { name: /^\d+ cal$/ })
  readonly caloriesInput = this.page.getByLabel('Calories', { exact: true })
  /** The Duration tile — reads "Add Duration" or "{n} min Duration". */
  readonly durationTile = this.page.getByRole('button', { name: /Duration$/ })
  readonly durationInput = this.page.getByLabel('Duration (min)')

  /** Free-type the session name (tap the name row, type, done). */
  async setName(name: string): Promise<void> {
    await this.nameButton.click()
    await this.nameInput.fill(name)
    await this.nameInput.blur()
  }

  /** Open the duration editor if its tile is collapsed, then set minutes. */
  async setDuration(minutes: number): Promise<void> {
    if (!(await this.durationInput.isVisible())) {
      await this.durationTile.click()
    }
    await this.durationInput.fill(String(minutes))
  }

  /** Tap the calorie number and type a manual override. */
  async setCaloriesOverride(calories: number): Promise<void> {
    await this.caloriesButton.click()
    await this.caloriesInput.fill(String(calories))
    await this.caloriesInput.blur()
  }

  /** Open the activity picker (new entries start with it open). */
  async openPicker(): Promise<void> {
    await expect(this.activitySearch.or(this.nameButton)).toBeVisible()
    if (!(await this.activitySearch.isVisible())) {
      await this.page.getByRole('button', { name: 'Change', exact: true }).click()
    }
  }

  /**
   * Pick a built-in activity through search. Searching skips the picker's
   * Recent list, whose rows prefill from (or one-tap re-log) old entries.
   */
  async pickActivity(name: string): Promise<void> {
    await this.openPicker()
    await this.activitySearch.fill(name)
    // Rows read "{name} ~{n} cal / 30 min" (or "{name} {met} MET" with no weight).
    await this.page
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(name)} ~?\\d`) })
      .click()
    await expect(this.nameButton).toContainText(name)
  }

  /**
   * Log a cardio session under a free-typed name with exact calories: pick a
   * stand-in activity, rename it, override the calories (so MET is moot).
   */
  async logCardio(name: string, minutes: number, calories: number): Promise<void> {
    await expect(this.heading).toBeVisible()
    await this.pickActivity('Yoga')
    await this.setName(name)
    await this.setDuration(minutes)
    await this.setCaloriesOverride(calories)
    await this.saveButton.click()
  }

  /**
   * Create and pick a custom activity (name + MET) from the picker.
   * The inline form has its own "Name" field, scoped through its card.
   */
  async createCustomActivity(name: string, met: number): Promise<void> {
    await this.openPicker()
    await this.page.getByRole('button', { name: 'New custom activity', exact: true }).click()
    const card = this.page.getByText('New custom activity', { exact: true }).locator('..')
    await card.getByLabel('Name', { exact: true }).fill(name)
    await card.getByLabel('Intensity (MET)').fill(String(met))
    await this.page.getByRole('button', { name: 'Add activity' }).click()
    // Picking closes the picker and puts the activity on the name row.
    await expect(this.page.getByText('New custom activity')).toBeHidden()
    await expect(this.nameButton).toContainText(name)
  }

  /** Log using the MET estimate (no calorie override). */
  async logEstimated(minutes: number): Promise<void> {
    await this.setDuration(minutes)
    await this.saveButton.click()
  }

  /** Wait for the edit form's async prefill (duration shows on its tile). */
  async expectEditLoaded(minutes: number): Promise<void> {
    await expect(this.editHeading).toBeVisible()
    await expect(this.durationTile).toContainText(`${minutes} min`)
  }
}
