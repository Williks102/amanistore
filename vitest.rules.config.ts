import { defineConfig } from 'vitest/config';

// Tests des règles Firestore: nécessitent l'émulateur (npm run test:rules).
export default defineConfig({
  test: { environment: 'node', include: ['tests/rules/**/*.test.ts'], testTimeout: 20000, fileParallelism: false },
});
