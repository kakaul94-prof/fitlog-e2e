import type { Locator, Page } from '@playwright/test'

export type TabName = 'Diary' | 'Exercise' | 'Progress' | 'More'

/** The app's bottom tab bar — present on every top-level signed-in page. */
export class BottomNav {
  readonly nav: Locator

  constructor(page: Page) {
    this.nav = page.getByRole('navigation')
  }

  tab(name: TabName): Locator {
    return this.nav.getByRole('link', { name, exact: true })
  }

  /** The currently highlighted tab (React Router marks it aria-current="page"). */
  get activeTab(): Locator {
    return this.nav.locator('[aria-current="page"]')
  }

  async goTo(name: TabName): Promise<void> {
    await this.tab(name).click()
  }
}
