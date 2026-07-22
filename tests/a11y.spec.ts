import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect } from '../fixtures/test-options'
import type { TabName } from '../pages/components/BottomNav'

/** Serious + critical axe violations, compacted for a readable failure diff. */
async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    // Known app-wide finding (muted-foreground text), tracked as an upstream
    // FitLog fix (README → future work). Everything else stays enforced.
    .disableRules(['color-contrast'])
    .analyze()
  return results.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }))
}

// Accessibility is browser-independent — run once on desktop Chrome.
// eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
test.skip(
  ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
  'runs on desktop Chrome only',
)

/**
 * Genuine findings this gate surfaced, pinned until they're fixed upstream in
 * the app (README → future work). The assertion still fails on any NEW
 * violation anywhere, and on these once they disappear (shrink the list then).
 */
const KNOWN_VIOLATIONS: Record<string, Array<Record<string, unknown>>> = {
  Progress: [
    { help: 'Form elements must have labels', id: 'label', impact: 'critical', nodes: 1 },
    {
      help: 'Select element must have an accessible name',
      id: 'select-name',
      impact: 'critical',
      nodes: 1,
    },
  ],
}

test.describe('accessibility (axe)', () => {
  test('each main tab has no serious or critical violations beyond the known set', async ({
    page,
    diaryPage,
    bottomNav,
  }) => {
    await diaryPage.goto()
    await diaryPage.expectLoaded()
    expect.soft(await scan(page), 'Diary violations').toEqual([])

    const tabs: Array<{ name: TabName; heading: string }> = [
      { name: 'Exercise', heading: 'Exercise' },
      { name: 'Progress', heading: 'Progress' },
      { name: 'More', heading: 'More' },
    ]
    for (const { name, heading } of tabs) {
      await bottomNav.goTo(name)
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
      expect
        .soft(await scan(page), `${name} violations`)
        .toEqual(KNOWN_VIOLATIONS[name] ?? [])
    }
  })
})

test.describe('accessibility (axe) — signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the login page has no serious or critical violations', async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto()
    await loginPage.expectLoaded()
    expect(await scan(page), 'Login violations').toEqual([])
  })
})
