import { expect, type Locator, type Page } from '@playwright/test'

/**
 * The pre-workout check-in sheet FitLog opens when a workout starts (shipped
 * 2026-10-11). The app skips it when there is nothing to ask (morning
 * check-in done and no tracked joints loaded), so callers pass the screen
 * they expect next and the sheet is handled either way.
 */
export class CheckinSheet {
  readonly dialog: Locator
  readonly skipButton: Locator

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Pre-workout check-in' })
    this.skipButton = this.dialog.getByRole('button', { name: 'Skip', exact: true })
  }

  /**
   * Skip the check-in if it opens. Skip records no check-in and applies no
   * swaps, so the workout starts exactly as the test set it up.
   */
  async skipIfShown(next: Locator): Promise<void> {
    await expect(this.skipButton.or(next)).toBeVisible()
    if (await this.skipButton.isVisible()) await this.skipButton.click()
    await expect(next).toBeVisible()
  }
}
