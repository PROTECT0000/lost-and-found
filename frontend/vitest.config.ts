import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Non-UTC zone so tests catch UTC/local mix-ups.
    env: { TZ: 'Asia/Jakarta' },
  },
})
