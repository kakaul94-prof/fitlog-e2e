import type { Page } from '@playwright/test'

/**
 * Base for all page objects: holds the Playwright page and standardizes
 * navigation. Subclasses declare their route and expose intention-revealing
 * locators/actions so specs read like user scenarios.
 */
export abstract class BasePage {
  protected abstract readonly path: string

  constructor(protected readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.path)
  }
}
