import { defineConfig } from "vitest/config";

// Testes de integração com o banco local (npm run test:db). Cada teste faz rollback.
export default defineConfig({
  test: {
    include: ["db/tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
