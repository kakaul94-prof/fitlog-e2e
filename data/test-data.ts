import type { SeedNutrients } from '../utils/supabase-api'

/**
 * Known nutrient sets for seeded foods. Values are deliberately distinctive so
 * assertions on scaled amounts (e.g. 2 servings of OATS = 246 kcal) can't
 * accidentally match other UI numbers.
 */
export const SEED_FOODS = {
  oats: { kcal: 123, protein: 8, carb: 20, fat: 5 } satisfies SeedNutrients,
  rice: { kcal: 100, carb: 25 } satisfies SeedNutrients,
  chicken: { kcal: 300, protein: 40 } satisfies SeedNutrients,
} as const

/** Calories shown for N servings of a seed food (the app rounds). */
export function scaledKcal(seed: SeedNutrients, servings: number): number {
  return Math.round(seed.kcal * servings)
}
