import { defineConfig, devices } from "@playwright/test";

/**
 * A vitrine tinha dois bugs que só apareceram porque o dono do repo olhou a tela
 * — faixa branca no scroll e rolagem órfã ao filtrar. Nenhum dos dois quebra
 * build, typecheck ou portão de registry: são invariantes de layout, e é isso
 * que esta suíte trava.
 *
 * Um browser só (Chromium). A vitrine não é um produto multi-engine; rodar três
 * triplicaria o tempo para cobrir o mesmo defeito.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
