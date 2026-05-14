import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.mjs'],
    exclude: ['tests/helpers/**'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['module/**/*.mjs'],
      exclude: ['**/*.test.mjs']
    }
  }
});
