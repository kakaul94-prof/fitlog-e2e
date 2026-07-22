import { requireEnv } from './env'

export interface Creds {
  email: string
  password: string
}

/**
 * Test accounts available to the suite. Account 0 is the required base pair
 * (E2E_EMAIL / E2E_PASSWORD); accounts 1-3 come from optional
 * E2E_EMAIL_W1..W3 / E2E_PASSWORD_W1..W3 and unlock true parallel isolation
 * of account-global state (profile, streak, latest weight, sessions).
 * With no extra accounts configured, every worker falls back to account 0 —
 * exactly the pre-existing behavior.
 */
export function allAccounts(): Creds[] {
  const accounts: Creds[] = [
    { email: requireEnv('E2E_EMAIL'), password: requireEnv('E2E_PASSWORD') },
  ]
  for (let i = 1; i <= 3; i++) {
    const email = process.env[`E2E_EMAIL_W${i}`]
    const password = process.env[`E2E_PASSWORD_W${i}`]
    if (email && password) accounts.push({ email, password })
  }
  return accounts
}

/** The account a given Playwright worker should use (round-robin). */
export function accountForWorker(workerIndex: number): {
  creds: Creds
  accountIndex: number
} {
  const accounts = allAccounts()
  const accountIndex = workerIndex % accounts.length
  return { creds: accounts[accountIndex]!, accountIndex }
}
