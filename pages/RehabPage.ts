import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

export interface NewInjury {
  /** Site chip label, e.g. 'Knee', 'Low back'. Form default: Shoulder. */
  site?: string
  /** Form default: left (paired sites only). */
  side?: 'left' | 'right' | 'both'
  note?: string
  /** 'YYYY-MM-DD'. Form default: today. */
  started?: string
}

/** The Rehab centre list (/rehab) and its inline "Log an injury" form. */
export class RehabPage extends BasePage {
  protected readonly path = '/rehab'

  readonly heading = this.page.getByRole('heading', { name: 'Rehab', exact: true })
  readonly emptyState = this.page.getByText(/^Nothing in rehab\./)
  readonly resolvedHeading = this.page.getByRole('heading', { name: 'Resolved', level: 2 })
  readonly logInjuryButton = this.page.getByRole('button', { name: 'Log an injury' })
  readonly noteInput = this.page.getByLabel('What it feels like (optional)')
  readonly startedInput = this.page.getByLabel('Started', { exact: true })
  readonly startTrackingButton = this.page.getByRole('button', { name: 'Start tracking' })

  async open(): Promise<void> {
    await this.goto()
    await expect(this.heading).toBeVisible()
  }

  /** An active card or resolved row, by the injury's derived name ("Both knee"). */
  injuryCard(name: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\b`) })
  }

  /** Fill and submit the form; the app then opens the new injury's page. */
  async logInjury(injury: NewInjury = {}): Promise<void> {
    await this.logInjuryButton.click()
    // Chips match whole-name: "both" would otherwise also hit a "Both knee" card.
    if (injury.site) await this.chip(injury.site).click()
    if (injury.side) await this.chip(injury.side).click()
    if (injury.note) await this.noteInput.fill(injury.note)
    if (injury.started) await this.startedInput.fill(injury.started)
    await this.startTrackingButton.click()
  }

  private chip(label: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') })
  }
}
