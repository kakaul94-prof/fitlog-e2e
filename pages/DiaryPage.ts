import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

export type MealLabel = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'

/** Diary tab — the signed-in landing page (food log + day totals). */
export class DiaryPage extends BasePage {
  protected readonly path = '/'

  readonly heading = this.page.getByRole('heading', { name: 'Diary', level: 1 })
  readonly previousDayButton = this.page.getByRole('button', { name: 'Previous day' })
  readonly nextDayButton = this.page.getByRole('button', { name: 'Next day' })

  async expectLoaded(): Promise<void> {
    // First paint after a cold navigation (lazy route + session restore) can
    // exceed the default expect timeout on slower engines.
    await expect(this.heading).toBeVisible({ timeout: 20_000 })
  }

  /** Open the diary at a specific date (?date=YYYY-MM-DD). */
  async gotoDate(date: string): Promise<void> {
    await this.page.goto(`/?date=${date}`)
    await this.expectLoaded()
  }

  /** A meal card's header button — its name reads "{Meal} {kcal} calories". */
  mealHeader(meal: MealLabel): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${meal} \\d`) })
  }

  /** The whole meal card (header + entry rows + Add food). */
  mealCard(meal: MealLabel): Locator {
    return this.mealHeader(meal).locator('..')
  }

  /** A logged entry row — accessible name is "{food name} {kcal} calories". */
  entryRow(foodName: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(foodName)} \\d+ calories`),
    })
  }

  /**
   * The day's consumed-calories total in the hero card. With a calorie goal
   * configured it reads "− {kcal} food" (U+2212 or hyphen); on a profile
   * without a goal the hero falls back to "{kcal} calories eaten".
   */
  foodTotal(kcal: number): Locator {
    return this.page.getByText(new RegExp(`[−-] ${kcal} food|${kcal} calories eaten`))
  }

  async openAddFood(meal: MealLabel): Promise<void> {
    await this.mealCard(meal).getByRole('button', { name: 'Add food' }).click()
  }

  /** A cardio row in the Exercise card — "{name} {min} min · {kcal} calories". */
  exerciseRow(name: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(name)} \\d+ min`),
    })
  }

  async openAddExercise(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add exercise', exact: true }).click()
  }

  /** The hero card's "{kcal} goal" line (the day's calorie target). */
  calorieGoal(kcal: number): Locator {
    return this.page.getByText(`${kcal} goal`)
  }

  /**
   * The 🔥 streak pill in the header. It has no accessible handle (README →
   * future work) — it's the only digits-only text in the page header.
   */
  readonly streakBadge = this.page.locator('header').getByText(/^\d+$/)

  /** The hero's "+ {kcal} exercise" line (eat-back enabled + burn logged). */
  exerciseCredit(kcal: number): Locator {
    return this.page.getByText(`+ ${kcal} exercise`)
  }

  /** The calorie dial, addressable by its accessible remaining-calories name. */
  remainingRing(kcal: number): Locator {
    return this.page.getByRole('img', { name: `${kcal} calories remaining` })
  }

  /**
   * Press-and-hold an entry row to open its action sheet (the app's
   * useLongPress fires at 450ms of pointer hold without movement).
   */
  async longPressEntry(foodName: string): Promise<void> {
    const row = this.entryRow(foodName)
    await row.hover()
    await this.page.mouse.down()
    // Fixed interaction duration (the app's threshold is 450ms), not a
    // wait-for-state — the page-object layer is exempt from no-wait-for-timeout.
    await this.page.waitForTimeout(700)
    await this.page.mouse.up()
    await expect(this.page.getByRole('button', { name: 'Select multiple' })).toBeVisible()
  }

  /** From the long-press sheet: enter select mode (the pressed row preselected). */
  async enterSelectMode(): Promise<void> {
    await this.page.getByRole('button', { name: 'Select multiple' }).click()
  }

  /** Select-mode header, e.g. "2 selected". */
  selectionCount(count: number): Locator {
    return this.page.getByRole('heading', { name: `${count} selected`, level: 1 })
  }

  /** In select mode: save the selected entries as a named meal. */
  async saveSelectionAsMeal(mealName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Save as meal' }).click()
    await this.page.getByPlaceholder(/^Meal name/).fill(mealName)
    const saveButton = this.page.getByRole('button', { name: 'Save meal' })
    await saveButton.click()
    // The sheet closes (and select mode exits) once the meal is stored.
    await expect(saveButton).toBeHidden()
    await this.expectLoaded()
  }
}
