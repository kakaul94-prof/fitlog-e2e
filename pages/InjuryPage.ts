import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'
import { escapeRegExp } from '../utils/test-data'

/** One injury's page (/rehab/:id): pain check-in, rehab plan, status. */
export class InjuryPage extends BasePage {
  // Ids are generated client-side, so injuries are opened from the list.
  protected readonly path = '/rehab'

  readonly backButton = this.page.getByRole('button', { name: 'Back', exact: true })
  /** Header subtitle: "Day N · started …" while active, "Closed … · ran N days" after. */
  readonly statusLine = this.page.getByText(/^(Day \d+ · started |Closed .* · ran )/)
  readonly painWidget = this.page.getByRole('heading', { name: /^How is it today\?/ })
  readonly addExerciseButton = this.page.getByRole('button', { name: 'Add rehab exercise' })
  readonly pickerDoneButton = this.page.getByRole('button', { name: 'Done', exact: true })
  readonly doneTodayButton = this.page.getByRole('button', { name: 'Done today' })
  readonly undoButton = this.page.getByRole('button', { name: 'Undo', exact: true })
  readonly markResolvedButton = this.page.getByRole('button', { name: 'Mark resolved' })
  readonly reopenButton = this.page.getByRole('button', { name: 'Reopen' })
  readonly deleteButton = this.page.getByRole('button', { name: 'Delete', exact: true })
  readonly deleteForGoodButton = this.page.getByRole('button', { name: 'Delete for good' })
  readonly notFound = this.page.getByText('That injury is no longer here.')

  heading(name: string): Locator {
    return this.page.getByRole('heading', { name, level: 1 })
  }

  painButton(n: number): Locator {
    return this.page.getByRole('button', { name: `Pain ${n} of 10`, exact: true })
  }

  /** A plan row's "done / target" chip; tapping it opens the target stepper. */
  targetChip(exercise: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^Edit weekly target for ${escapeRegExp(exercise)} \\(`),
    })
  }

  readonly moreSessionsButton = this.page.getByRole('button', { name: 'More sessions a week' })
  readonly fewerSessionsButton = this.page.getByRole('button', { name: 'Fewer sessions a week' })

  /** Wait for the injury's page and return its id (from /rehab/:id). */
  async expectLoaded(name: string): Promise<string> {
    await expect(this.heading(name)).toBeVisible()
    await expect(this.page).toHaveURL(/\/rehab\/[^/]+$/)
    return new URL(this.page.url()).pathname.split('/').pop()!
  }

  /** Add one library exercise through the picker, then close it. */
  async addLibraryExercise(name: string): Promise<void> {
    await this.addExerciseButton.click()
    // Anchored: the plan row's "Remove {name}" button contains the same words.
    await this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}`) }).click()
    await this.pickerDoneButton.click()
    await expect(this.page.getByRole('button', { name: `Remove ${name}` })).toBeVisible()
  }
}
