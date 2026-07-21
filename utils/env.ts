const ENV_HINT =
  'Copy .env.example to .env and fill it in (locally), or set it as a GitHub Actions secret (CI).'

type RequiredVar = 'E2E_EMAIL' | 'E2E_PASSWORD' | 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'

/** Read a required environment variable, failing fast with a helpful message. */
export function requireEnv(name: RequiredVar): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. ${ENV_HINT}`)
  }
  return value
}
