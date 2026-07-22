import { randomUUID } from 'node:crypto'

/** Prefix for all data the suite creates — the teardown sweep deletes by it. */
export const E2E_PREFIX = 'E2E'

/** Unique, greppable name for a food/recipe created by a test. */
export function uniqueName(label: string): string {
  return `${E2E_PREFIX} ${label} ${randomUUID().slice(0, 8)}`
}

/** Escape a string for use inside a RegExp (locator names include user data). */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Today ± offset as a LOCAL-timezone ISO date — matching what the app's
 * todayISO() computes in the browser on the same machine/runner.
 */
export function localDateISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { dateStyle: 'short' }).format(d)
}

/** ISO date arithmetic (UTC-noon anchor sidesteps DST edges). */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * A random diary date in the 1990s. Tests that assert day totals use a unique
 * past date so the day contains only their own entries — parallel tests (and
 * other browser projects) all write to the same account, but never to the same
 * day. Far-past dates also can't disturb the streak, which only looks at a
 * consecutive run ending today.
 */
export function uniquePastDate(): string {
  const rand = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1))
  const year = rand(1990, 1999)
  const month = String(rand(1, 12)).padStart(2, '0')
  const day = String(rand(1, 28)).padStart(2, '0')
  return `${year}-${month}-${day}`
}
