import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta (Playwright): fluxos principais no modo 2D e na cidade 3D,
 * no desktop e num celular emulado. Rodam contra o build de produção numa porta
 * separada (3100), para não brigar com o `npm run dev` na 3000.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

// WebGL por software no Chromium sem tela (a cidade 3D precisa dele nos testes)
const webglArgs = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { args: webglArgs } } },
    { name: "celular", use: { ...devices["Pixel 7"], launchOptions: { args: webglArgs } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `${baseURL}/pt`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
