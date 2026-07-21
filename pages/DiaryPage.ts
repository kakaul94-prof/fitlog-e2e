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
}
