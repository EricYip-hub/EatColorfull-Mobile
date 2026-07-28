import { defineConfig } from "@playwright/test";

const chromiumPath = process.env.CHROMIUM_PATH || "/bin/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  globalTeardown: "./e2e/zip-pixel-diff.teardown.ts",
  // Skip the local preview server when smoke-testing a remote BASE_URL
  // (e.g. post-deploy runs against the live site).
  webServer: process.env.PW_NO_WEBSERVER
    ? undefined
    : {
        command: "bun run preview --port 8080",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    headless: true,
    trace: "off",
    launchOptions: { executablePath: chromiumPath },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
