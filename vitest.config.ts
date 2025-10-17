import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    passWithNoTests: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4,
        isolate: true,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      // Temporarily exclude until Phase 2 mock infrastructure implemented
      'tests/unit/services/auto-match.test.ts',
      'tests/unit/services/recommendations.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        '*.config.*',
        'src/types/**',
        '**/*.d.ts',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/middleware.ts',
        'src/lib/supabase/**',
        'src/i18n/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
