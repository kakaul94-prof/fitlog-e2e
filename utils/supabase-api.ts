import fs from 'node:fs'
import path from 'node:path'
import { request, type APIRequestContext } from '@playwright/test'
import { STORAGE_STATE } from '../playwright.config'
import { requireEnv } from './env'
import { E2E_PREFIX } from './test-data'

/** The supabase-js session shape a password grant returns. */
interface SupabaseSession {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  expires_at?: number
  user?: unknown
}

export interface SeedNutrients {
  kcal: number
  protein?: number
  carb?: number
  fat?: number
  fiber?: number
}

/** An alternate serving unit stored on a food (subset of the app's Portion). */
export interface SeedPortion {
  id: string
  label: string
  grams: number
}

/** The profile columns the goals specs capture and restore. */
export interface ProfileRow {
  id: string
  calorie_goal_mode: string | null
  manual_calorie_goal: number | null
  calorie_goal_history: unknown
  eat_back_exercise: boolean | null
  macro_targets: unknown
}

/** The diary_entries columns the API specs assert on. */
export interface DiaryEntryRow {
  id: string
  entry_date: string
  meal: string
  food_name: string
  servings: number
  nutrients: { kcal?: number }
}

/**
 * Thin Supabase REST (PostgREST) client authenticated as the E2E user.
 * Used to seed prerequisite rows and to clean up what tests create — the
 * deployed app exposes no test hooks, and RLS confines every call to the
 * test account's own data.
 *
 * By default the access token is read from a storageState file (no extra
 * sign-in) — auth.setup's for account 0, or a worker's synthesized state.
 * Passing creds forces a fresh password grant (teardown sweeps, canary).
 */
export class SupabaseApi {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(
    options: { creds?: { email: string; password: string }; stateFile?: string } = {},
  ): Promise<SupabaseApi> {
    const url = requireEnv('SUPABASE_URL')
    const anonKey = requireEnv('SUPABASE_ANON_KEY')
    const token = options.creds
      ? (await passwordGrant(url, anonKey, options.creds)).access_token
      : (readTokenFromStorageState(options.stateFile) ??
        (await passwordGrant(url, anonKey)).access_token)
    const ctx = await request.newContext({
      baseURL: url,
      extraHTTPHeaders: { apikey: anonKey, Authorization: `Bearer ${token}` },
    })
    return new SupabaseApi(ctx)
  }

  /**
   * Sign an account in over REST and write a Playwright storageState file
   * whose localStorage carries the supabase-js session — a browser context
   * loading it starts authenticated as that account, no UI login needed.
   * Used by the per-worker auth fixture for accounts beyond account 0.
   */
  static async createStorageStateFile(
    creds: { email: string; password: string },
    filePath: string,
  ): Promise<void> {
    const url = requireEnv('SUPABASE_URL')
    const anonKey = requireEnv('SUPABASE_ANON_KEY')
    const session = await passwordGrant(url, anonKey, creds)
    if (!session.expires_at) {
      session.expires_at = Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600)
    }
    const projectRef = new URL(url).hostname.split('.')[0]
    const baseURL = process.env.BASE_URL ?? 'https://fitlog-9wl.pages.dev'
    const state = {
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [
            { name: `sb-${projectRef}-auth-token`, value: JSON.stringify(session) },
          ],
        },
      ],
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(state))
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
  async createFood(
    name: string,
    nutrients: SeedNutrients,
    options: { servingGrams?: number; portions?: SeedPortion[] } = {},
  ): Promise<{ id: string }> {
    const res = await this.ctx.post('/rest/v1/foods', {
      headers: { Prefer: 'return=representation' },
      data: {
        name,
        source: 'manual',
        serving_qty: 1,
        serving_unit: 'serving',
        serving_grams: options.servingGrams ?? null,
        portions: options.portions ?? [],
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

  /** Whether a food row is archived (the app's "delete" is a soft delete). */
  async isFoodArchived(name: string): Promise<boolean | null> {
    const rows = await this.getRows<{ archived: boolean }>('/rest/v1/foods', {
      name: `eq.${name}`,
      select: 'archived',
    })
    return rows[0]?.archived ?? null
  }

  /** The full stored row for a food, for contract checks. */
  async getFoodRowByName(name: string): Promise<Record<string, unknown>> {
    const rows = await this.getRows<Record<string, unknown>>('/rest/v1/foods', {
      name: `eq.${name}`,
    })
    const row = rows[0]
    if (!row) throw new Error(`getFoodRowByName: no food named ${name}`)
    return row
  }

  /** Insert a body measurement (weight by default). */
  async createMeasurement(input: { date: string; value: number }): Promise<void> {
    const res = await this.ctx.post('/rest/v1/measurements', {
      data: {
        measured_on: input.date,
        type: 'weight',
        value: input.value,
        unit: 'lb',
      },
    })
    if (!res.ok()) {
      throw new Error(`createMeasurement failed: ${res.status()} ${await res.text()}`)
    }
  }

  /** Seed a strength goal so add-exercise produces progression suggestions. */
  async createStrengthGoal(input: {
    exerciseKey: string
    exerciseName: string
    targetWeightLb: number
    targetReps: number
    target1rmLb: number
    method: 'linear' | 'double' | '531'
    incrementLb: number
    repLow: number
    repHigh: number
    sets: number
  }): Promise<void> {
    const res = await this.ctx.post('/rest/v1/strength_goals', {
      data: {
        exercise_key: input.exerciseKey,
        exercise_name: input.exerciseName,
        target_weight_lb: input.targetWeightLb,
        target_reps: input.targetReps,
        target_1rm_lb: input.target1rmLb,
        method: input.method,
        increment_lb: input.incrementLb,
        rep_low: input.repLow,
        rep_high: input.repHigh,
        sets: input.sets,
      },
    })
    if (!res.ok()) {
      throw new Error(`createStrengthGoal failed: ${res.status()} ${await res.text()}`)
    }
  }

  async deleteCustomActivitiesByName(name: string): Promise<void> {
    await this.delete('/rest/v1/custom_activities', { name: `eq.${name}` })
  }

  /** Remove E2E-named diary entries on one specific date (streak isolation). */
  async deleteE2EDiaryEntriesOn(date: string): Promise<void> {
    await this.delete('/rest/v1/diary_entries', {
      entry_date: `eq.${date}`,
      food_name: `like.${E2E_PREFIX} *`,
    })
  }

  /** GET diary entries with PostgREST filters — also used by the API specs. */
  async getDiaryEntries(filter: Record<string, string>): Promise<DiaryEntryRow[]> {
    return this.getRows<DiaryEntryRow>('/rest/v1/diary_entries', filter)
  }

  async deleteDiaryEntriesByFoodName(foodName: string): Promise<void> {
    await this.delete('/rest/v1/diary_entries', { food_name: `eq.${foodName}` })
  }

  async deleteExerciseEntriesByName(name: string): Promise<void> {
    await this.delete('/rest/v1/exercise_entries', { name: `eq.${name}` })
  }

  /** Insert a standalone diary entry (a snapshot row, like the app's quick add). */
  async createDiaryEntry(input: {
    date: string
    meal: string
    name: string
    kcal: number
    servings?: number
  }): Promise<void> {
    const res = await this.ctx.post('/rest/v1/diary_entries', {
      data: {
        entry_date: input.date,
        meal: input.meal,
        food_name: input.name,
        servings: input.servings ?? 1,
        nutrients: { kcal: input.kcal },
      },
    })
    if (!res.ok()) {
      throw new Error(
        `createDiaryEntry(${input.name}) failed: ${res.status()} ${await res.text()}`,
      )
    }
  }

  /** Delete a saved meal by name (meal_items cascade). */
  async deleteMealsByName(name: string): Promise<void> {
    await this.delete('/rest/v1/meals', { name: `eq.${name}` })
  }

  /** Delete a workout template by name (routine_exercises cascade). */
  async deleteRoutinesByName(name: string): Promise<void> {
    await this.delete('/rest/v1/routines', { name: `eq.${name}` })
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

  /** A library food's stored per-serving calories (recipes included). */
  async getFoodKcalByName(name: string): Promise<number | null> {
    const rows = await this.getRows<{ nutrients: { kcal?: number } }>('/rest/v1/foods', {
      name: `eq.${name}`,
      select: 'nutrients',
    })
    return rows[0]?.nutrients.kcal ?? null
  }

  /** The stored set values for an exercise key (server truth, cache-free). */
  async getWorkoutSetValues(
    exerciseKey: string,
  ): Promise<Array<{ weight_lb: number | null; reps: number | null }>> {
    return this.getRows('/rest/v1/workout_sets', {
      exercise_key: `eq.${exerciseKey}`,
      select: 'weight_lb,reps',
    })
  }

  /** Create a custom exercise directly; returns its app-side key. */
  async createCustomExercise(name: string): Promise<string> {
    const res = await this.ctx.post('/rest/v1/custom_exercises', {
      headers: { Prefer: 'return=representation' },
      data: { name, type: 'weighted' },
    })
    if (!res.ok()) {
      throw new Error(`createCustomExercise failed: ${res.status()} ${await res.text()}`)
    }
    const [row] = (await res.json()) as Array<{ id: string }>
    if (!row) throw new Error('createCustomExercise: empty response')
    return `custom:${row.id}`
  }

  /**
   * Seed a completed workout with one exercise and its sets — history for
   * progression/records tests without driving the UI. Call in chronological
   * order: the app treats the most recently INSERTED sets as the last session.
   */
  async createCompletedWorkout(input: {
    exerciseKey: string
    exerciseName: string
    date: string
    sets: Array<{ weightLb: number; reps: number }>
  }): Promise<void> {
    const workoutRes = await this.ctx.post('/rest/v1/workouts', {
      headers: { Prefer: 'return=representation' },
      data: { workout_date: input.date, name: 'Workout', completed: true },
    })
    if (!workoutRes.ok()) {
      throw new Error(
        `createCompletedWorkout(workout) failed: ${workoutRes.status()} ${await workoutRes.text()}`,
      )
    }
    const [workout] = (await workoutRes.json()) as Array<{ id: string }>
    if (!workout) throw new Error('createCompletedWorkout: empty workout response')

    const weRes = await this.ctx.post('/rest/v1/workout_exercises', {
      headers: { Prefer: 'return=representation' },
      data: {
        workout_id: workout.id,
        exercise_key: input.exerciseKey,
        exercise_name: input.exerciseName,
        position: 0,
      },
    })
    if (!weRes.ok()) {
      throw new Error(
        `createCompletedWorkout(exercise) failed: ${weRes.status()} ${await weRes.text()}`,
      )
    }
    const [we] = (await weRes.json()) as Array<{ id: string }>
    if (!we) throw new Error('createCompletedWorkout: empty exercise response')

    const setsRes = await this.ctx.post('/rest/v1/workout_sets', {
      data: input.sets.map((s, i) => ({
        workout_id: workout.id,
        workout_exercise_id: we.id,
        exercise_key: input.exerciseKey,
        exercise_name: input.exerciseName,
        set_number: i + 1,
        reps: s.reps,
        weight_lb: s.weightLb,
      })),
    })
    if (!setsRes.ok()) {
      throw new Error(
        `createCompletedWorkout(sets) failed: ${setsRes.status()} ${await setsRes.text()}`,
      )
    }
  }

  /** The app-side key (custom:<uuid>) for a custom exercise, by name. */
  async getCustomExerciseKey(name: string): Promise<string> {
    const rows = await this.getRows<{ id: string }>('/rest/v1/custom_exercises', {
      name: `eq.${name}`,
      select: 'id',
    })
    const row = rows[0]
    if (!row) throw new Error(`getCustomExerciseKey: no custom exercise named ${name}`)
    return `custom:${row.id}`
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
      const key = `custom:${custom.id}`
      const sets = await this.getRows<{ workout_id: string }>(
        '/rest/v1/workout_sets',
        { exercise_key: `eq.${key}`, select: 'workout_id' },
      )
      const workoutIds = [...new Set(sets.map((s) => s.workout_id))]
      if (workoutIds.length > 0) {
        await this.delete('/rest/v1/workouts', { id: `in.(${workoutIds.join(',')})` })
      }
      await this.delete('/rest/v1/strength_goals', { exercise_key: `eq.${key}` })
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
    await this.delete('/rest/v1/meals', { name: pattern })
    await this.delete('/rest/v1/routines', { name: pattern })
    await this.delete('/rest/v1/custom_activities', { name: pattern })
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
function readTokenFromStorageState(filePath: string = STORAGE_STATE): string | null {
  try {
    const state = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
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

async function passwordGrant(
  url: string,
  anonKey: string,
  creds?: { email: string; password: string },
): Promise<SupabaseSession> {
  const ctx = await request.newContext()
  try {
    const res = await ctx.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey },
      data: {
        email: creds?.email ?? requireEnv('E2E_EMAIL'),
        password: creds?.password ?? requireEnv('E2E_PASSWORD'),
      },
    })
    if (!res.ok()) {
      throw new Error(`Supabase password grant failed: ${res.status()} ${await res.text()}`)
    }
    return (await res.json()) as SupabaseSession
  } finally {
    await ctx.dispose()
  }
}
