import fs from 'node:fs'
import { request, type APIRequestContext } from '@playwright/test'
import { STORAGE_STATE } from '../playwright.config'
import { requireEnv } from './env'
import { E2E_PREFIX } from './test-data'

export interface SeedNutrients {
  kcal: number
  protein?: number
  carb?: number
  fat?: number
}

/** The profile columns the goals spec captures and restores. */
export interface ProfileRow {
  id: string
  calorie_goal_mode: string | null
  manual_calorie_goal: number | null
  calorie_goal_history: unknown
}

/**
 * Thin Supabase REST (PostgREST) client authenticated as the E2E user.
 * Used to seed prerequisite rows and to clean up what tests create — the
 * deployed app exposes no test hooks, and RLS confines every call to the
 * test account's own data.
 *
 * The access token is read from the storageState saved by auth.setup.ts
 * (no extra sign-in), falling back to a password grant.
 */
export class SupabaseApi {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(): Promise<SupabaseApi> {
    const url = requireEnv('SUPABASE_URL')
    const anonKey = requireEnv('SUPABASE_ANON_KEY')
    const token = readTokenFromStorageState() ?? (await passwordGrant(url, anonKey))
    const ctx = await request.newContext({
      baseURL: url,
      extraHTTPHeaders: { apikey: anonKey, Authorization: `Bearer ${token}` },
    })
    return new SupabaseApi(ctx)
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose()
  }

  /**
   * Run in-test cleanup without letting its own failure mask the test result
   * (e.g. after a test timeout the request context is already closed). The
   * suite-level sweep in cleanup.teardown.ts catches anything skipped here.
   */
  async bestEffort(cleanup: () => Promise<void>): Promise<void> {
    try {
      await cleanup()
    } catch (error) {
      console.warn(`cleanup skipped (the teardown sweep will handle it): ${error}`)
    }
  }

  /** Insert a manual food into the library; returns its id. */
  async createFood(name: string, nutrients: SeedNutrients): Promise<{ id: string }> {
    const res = await this.ctx.post('/rest/v1/foods', {
      headers: { Prefer: 'return=representation' },
      data: {
        name,
        source: 'manual',
        serving_qty: 1,
        serving_unit: 'serving',
        nutrients,
      },
    })
    if (!res.ok()) {
      throw new Error(`createFood(${name}) failed: ${res.status()} ${await res.text()}`)
    }
    const [row] = (await res.json()) as Array<{ id: string }>
    if (!row) throw new Error(`createFood(${name}): empty response`)
    return row
  }

  /** GET diary entries, optionally filtered — also used by the API specs. */
  async getDiaryEntries(filter: Record<string, string>): Promise<unknown[]> {
    const res = await this.ctx.get('/rest/v1/diary_entries', { params: filter })
    if (!res.ok()) {
      throw new Error(`getDiaryEntries failed: ${res.status()} ${await res.text()}`)
    }
    return (await res.json()) as unknown[]
  }

  async deleteDiaryEntriesByFoodName(foodName: string): Promise<void> {
    await this.delete('/rest/v1/diary_entries', { food_name: `eq.${foodName}` })
  }

  async deleteExerciseEntriesByName(name: string): Promise<void> {
    await this.delete('/rest/v1/exercise_entries', { name: `eq.${name}` })
  }

  async deleteMeasurements(type: string, value: number): Promise<void> {
    await this.delete('/rest/v1/measurements', {
      type: `eq.${type}`,
      value: `eq.${value}`,
    })
  }

  /** The signed-in user's profile row (RLS returns exactly one). */
  async getProfile(): Promise<ProfileRow> {
    const rows = await this.getRows<ProfileRow>('/rest/v1/profiles', {})
    const row = rows[0]
    if (!row) throw new Error('getProfile: no profile row visible')
    return row
  }

  async updateProfile(id: string, patch: Partial<ProfileRow>): Promise<void> {
    const res = await this.ctx.patch('/rest/v1/profiles', {
      params: { id: `eq.${id}` },
      data: patch,
    })
    if (!res.ok()) {
      throw new Error(`updateProfile failed: ${res.status()} ${await res.text()}`)
    }
  }

  /**
   * Remove a custom exercise and every workout that ever logged it (sets and
   * workout_exercises cascade from workouts). Tests use per-test custom
   * exercises, so those workouts contain nothing but test data.
   */
  async deleteStrengthDataForExercise(customExerciseName: string): Promise<void> {
    const customs = await this.getRows<{ id: string }>('/rest/v1/custom_exercises', {
      name: `eq.${customExerciseName}`,
      select: 'id',
    })
    for (const custom of customs) {
      const sets = await this.getRows<{ workout_id: string }>(
        '/rest/v1/workout_sets',
        { exercise_key: `eq.custom:${custom.id}`, select: 'workout_id' },
      )
      const workoutIds = [...new Set(sets.map((s) => s.workout_id))]
      if (workoutIds.length > 0) {
        await this.delete('/rest/v1/workouts', { id: `in.(${workoutIds.join(',')})` })
      }
      await this.delete('/rest/v1/custom_exercises', { id: `eq.${custom.id}` })
    }
  }

  /**
   * Delete library foods by exact name. Recipes must go before their
   * ingredient foods — recipe_ingredients restricts ingredient deletion until
   * the recipe row (and its cascade) is gone.
   */
  async deleteFoodsByName(name: string): Promise<void> {
    await this.delete('/rest/v1/foods', { name: `eq.${name}` })
  }

  /** Delete USDA-imported foods created after a timestamp (their names aren't E2E-prefixed). */
  async deleteUsdaFoodsCreatedAfter(isoTimestamp: string): Promise<void> {
    await this.delete('/rest/v1/foods', {
      source: 'eq.usda',
      created_at: `gte.${isoTimestamp}`,
    })
  }

  /**
   * Safety net run once after the whole suite (see cleanup.teardown.ts):
   * removes anything E2E-prefixed that a crashed test left behind.
   */
  async sweepE2EData(): Promise<void> {
    const pattern = `like.${E2E_PREFIX} *`
    await this.delete('/rest/v1/diary_entries', { food_name: pattern })
    // Recipes first — they block deletion of their ingredient foods. That
    // includes still-unnamed "New recipe" shells from tests that crashed
    // before renaming (the app creates recipes under that placeholder).
    await this.delete('/rest/v1/foods', { source: 'eq.recipe', name: pattern })
    await this.delete('/rest/v1/foods', { source: 'eq.recipe', name: 'eq.New recipe' })
    await this.delete('/rest/v1/foods', { name: pattern })
    await this.delete('/rest/v1/exercise_entries', { name: pattern })
    // Strength: E2E custom exercises drag their workouts along.
    const customs = await this.getRows<{ name: string }>('/rest/v1/custom_exercises', {
      name: pattern,
      select: 'name',
    })
    for (const c of customs) {
      await this.deleteStrengthDataForExercise(c.name)
    }
  }

  private async getRows<T>(path: string, params: Record<string, string>): Promise<T[]> {
    const res = await this.ctx.get(path, { params })
    if (!res.ok()) {
      throw new Error(`GET ${path} failed: ${res.status()} ${await res.text()}`)
    }
    return (await res.json()) as T[]
  }

  private async delete(path: string, params: Record<string, string>): Promise<void> {
    const res = await this.ctx.delete(path, { params })
    if (!res.ok()) {
      throw new Error(`DELETE ${path} failed: ${res.status()} ${await res.text()}`)
    }
  }
}

/** Reuse the session captured by auth.setup.ts instead of signing in again. */
function readTokenFromStorageState(): string | null {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8')) as {
      origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>
    }
    for (const origin of state.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        if (/^sb-.*-auth-token$/.test(item.name)) {
          const session = JSON.parse(item.value) as {
            access_token?: string
            currentSession?: { access_token?: string }
          }
          return session.access_token ?? session.currentSession?.access_token ?? null
        }
      }
    }
  } catch {
    // Fall through to a fresh password grant.
  }
  return null
}

async function passwordGrant(url: string, anonKey: string): Promise<string> {
  const ctx = await request.newContext()
  try {
    const res = await ctx.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey },
      data: {
        email: requireEnv('E2E_EMAIL'),
        password: requireEnv('E2E_PASSWORD'),
      },
    })
    if (!res.ok()) {
      throw new Error(`Supabase password grant failed: ${res.status()} ${await res.text()}`)
    }
    const body = (await res.json()) as { access_token: string }
    return body.access_token
  } finally {
    await ctx.dispose()
  }
}
