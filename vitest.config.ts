import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    sequence: {
      concurrent: false,
    },
  },
});
