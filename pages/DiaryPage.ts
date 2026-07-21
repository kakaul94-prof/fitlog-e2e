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
    await expect(this.heading).toBeVisible()
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

  /** The hero card's "− {kcal} food" line (day's consumed total). */
  foodTotal(kcal: number): Locator {
    // The app renders a U+2212 minus sign; accept a plain hyphen too.
    return this.page.getByText(new RegExp(`[−-] ${kcal} food`))
  }

  async openAddFood(meal: MealLabel): Promise<void> {
    await this.mealCard(meal).getByRole('button', { name: 'Add food' }).click()
  }
}
