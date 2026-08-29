import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The DB-backed flow test must run serially against the shared dev database.
    fileParallelism: false,
  },
});
