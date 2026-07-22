import { test, expect } from '../../fixtures/test-options'
import { requireEnv } from '../../utils/env'
import { uniqueName, uniquePastDate } from '../../utils/test-data'

/**
 * API-layer checks against Supabase REST (PostgREST). Kept light — the UI is
 * the primary surface; these demonstrate cross-layer verification and the
 * app's row-level-security posture.
 */
test.describe('diary API (Supabase REST)', () => {
  // API behavior is browser-independent — run once on desktop Chrome.
  // eslint-disable-next-line playwright/no-skipped-test -- intentional per-project gate
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'runs on desktop Chrome only',
  )

  test('a UI-logged entry is readable through the API with the owner token', async ({
    diaryPage,
    foodPickerPage,
    api,
  }) => {
    const entryName = uniqueName('ApiCheck')
    const date = uniquePastDate()
    const kcal = 321

    try {
      // Log through the real UI…
      await diaryPage.gotoDate(date)
      await diaryPage.openAddFood('Breakfast')
      await foodPickerPage.quickAdd('breakfast', entryName, kcal)
      await foodPickerPage.finish()
      await expect(diaryPage.entryRow(entryName)).toBeVisible()

      // …then verify the stored row directly over REST.
      const rows = await api.getDiaryEntries({
        entry_date: `eq.${date}`,
        food_name: `eq.${entryName}`,
      })
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        meal: 'breakfast',
        food_name: entryName,
        servings: 1,
        nutrients: { kcal },
      })
    } finally {
      await api.bestEffort(() => api.deleteDiaryEntriesByFoodName(entryName))
    }
  })

  test('stored rows keep the contract the suite depends on', async ({ api }) => {
    const foodName = uniqueName('Contract')
    const date = uniquePastDate()

    try {
      await api.createFood(foodName, { kcal: 123, protein: 9 })
      await api.createDiaryEntry({ date, meal: 'lunch', name: foodName, kcal: 123 })

      const food = await api.getFoodRowByName(foodName)
      expect(typeof food.id).toBe('string')
      expect(food.source).toBe('manual')
      expect(typeof food.serving_qty).toBe('number')
      expect(typeof food.serving_unit).toBe('string')
      expect(food.archived).toBe(false)
      expect(typeof food.created_at).toBe('string')
      expect(food.nutrients).toMatchObject({ kcal: 123, protein: 9 })

      const [entry] = await api.getDiaryEntries({ food_name: `eq.${foodName}` })
      expect(entry).toBeDefined()
      expect(entry!.entry_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry!.meal).toBe('lunch')
      expect(typeof entry!.servings).toBe('number')
      expect(entry!.nutrients.kcal).toBe(123)

      const profile = await api.getProfile()
      expect(typeof profile.id).toBe('string')
      expect(['calculated', 'manual', null]).toContain(profile.calorie_goal_mode)
    } finally {
      await api.bestEffort(async () => {
        await api.deleteDiaryEntriesByFoodName(foodName)
        await api.deleteFoodsByName(foodName)
      })
    }
  })

  test('row-level security returns no diary rows to unauthenticated requests', async ({
    request,
  }) => {
    // Anon key only — no user token. RLS is owner-only on every table, so the
    // API answers, but with zero rows.
    const res = await request.get(
      `${requireEnv('SUPABASE_URL')}/rest/v1/diary_entries`,
      {
        headers: { apikey: requireEnv('SUPABASE_ANON_KEY') },
        params: { select: 'id', limit: '5' },
      },
    )
    expect(res.ok()).toBe(true)
    expect(await res.json()).toEqual([])
  })
})
