import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import playwright from 'eslint-plugin-playwright'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['node_modules', 'playwright-report', 'test-results', 'blob-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Page-object assertion helpers (e.g. diaryPage.expectLoaded()) count as
      // assertions.
      'playwright/expect-expect': [
        'warn',
        { assertFunctionNames: ['expectLoaded', '*.expectLoaded'] },
      ],
    },
  },
  {
    // The teardown project sweeps leftover data — it asserts nothing by design.
    files: ['tests/cleanup.teardown.ts'],
    rules: { 'playwright/expect-expect': 'off' },
  },
  prettier,
)
