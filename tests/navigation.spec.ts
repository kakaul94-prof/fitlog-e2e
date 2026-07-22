import { test, expect } from '../fixtures/test-options'
import type { TabName } from '../pages/components/BottomNav'

const tabs: Array<{ name: TabName; heading: string }> = [
  { name: 'Exercise', heading: 'Exercise' },
  { name: 'Progress', heading: 'Progress' },
  { name: 'More', heading: 'More' },
  { name: 'Diary', heading: 'Diary' },
]

test('every bottom-nav tab loads its page without runtime errors', { tag: '@readonly' }, async ({
  page,
  diaryPage,
  bottomNav,
}) => {
  const pageErrors: Error[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await diaryPage.goto()
  await diaryPage.expectLoaded()

  for (const { name, heading } of tabs) {
    await bottomNav.goTo(name)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
    await expect(bottomNav.tab(name)).toHaveAttribute('aria-current', 'page')
  }

  expect(pageErrors, 'uncaught exceptions while navigating tabs').toEqual([])
  expect(consoleErrors, 'console errors while navigating tabs').toEqual([])
})
