import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/** The food library (/foods, /recipes, /meals share this page). */
export class LibraryPage extends BasePage {
  protected readonly path = '/recipes'

  readonly heading = this.page.getByRole('heading', { name: 'Food Library', level: 1 })
  // The header's "+" is icon-only with no accessible name (README → future
  // work). The page header holds exactly [back, +], so take its last button.
  // (CSS `header`, not role=banner — the app nests headers inside <main>,
  // which strips the banner role.)
  readonly headerActionButton = this.page.locator('header').getByRole('button').last()

  /** From /recipes, create a recipe and land in its editor. */
  async createRecipe(): Promise<void> {
    await this.goto()
    await expect(this.heading).toBeVisible()
    await this.headerActionButton.click()
    await expect(
      this.page.getByRole('heading', { name: 'Edit recipe', level: 1 }),
    ).toBeVisible()
  }
}
