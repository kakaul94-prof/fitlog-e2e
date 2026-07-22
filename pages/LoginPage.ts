import { expect } from '@playwright/test'
import { BasePage } from './BasePage'

/**
 * Signed-out landing view: email + password sign-in form.
 * (The app also offers a magic-link mode; the suite always uses password.)
 */
export class LoginPage extends BasePage {
  protected readonly path = '/'

  readonly emailInput = this.page.getByLabel('Email')
  readonly passwordInput = this.page.getByLabel('Password')
  readonly signInButton = this.page.getByRole('button', { name: 'Sign in', exact: true })
  // The form's inline error paragraph. The app exposes no testid/role for it —
  // styled via the `text-destructive` design token (see README → future work).
  readonly errorMessage = this.page.locator('form p.text-destructive')

  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signInButton.click()
  }

  async expectLoaded(): Promise<void> {
    // Signing in/out swaps whole views — allow the same first-paint headroom
    // as the diary landing.
    await expect(this.signInButton).toBeVisible({ timeout: 20_000 })
  }

  /** Lives on the More tab, but lands back on this page. */
  readonly signOutButton = this.page.getByRole('button', { name: 'Sign out' })
}
