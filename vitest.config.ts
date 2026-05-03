import { defineConfig } from 'vitest/config';
import path from 'path';

// Dummy env so modules that import supabase-admin at the top level
// (revisions.ts, costing route, etc.) don't crash during pure-function
// unit-test imports. Tests never hit Supabase — they only exercise
// pure logic. If a test does need the real client, override per-file.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-key';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
