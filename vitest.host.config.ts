import { defineConfig } from "vitest/config";

/**
 * HOST END-TO-END. Not part of `npm test`: it generates a host project, installs
 * that host's declared dependencies from the registry, runs a real production
 * build and launches an installed browser. Run with `npm run host:e2e`.
 */
export default defineConfig({
  test: {
    include: ["tests/host/**/*.host.ts"],
    environment: "node",
    testTimeout: 30 * 60 * 1000,
    hookTimeout: 30 * 60 * 1000,
  },
});
