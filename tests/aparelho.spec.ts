import { expect, test } from "@playwright/test";

/*
 * O que fica vivo na grade depende do aparelho (`src/app/aparelho.ts`), e cada
 * regra saiu de uma medição (PLANO-PERFORMANCE.md). Nenhuma delas quebra build
 * nem typecheck se alguém mexer: a grade só volta a travar no notebook de quem
 * visita. É isso que esta suíte prende. O nível é forçado por `?nivel=`, porque o
 * Chromium do teste herda os núcleos da máquina que roda.
 */

const vivas = (page) => page.locator("[data-viva]").count();

test("baixo: a grade é só foto, nenhuma peça monta", async ({ page }) => {
  await page.goto("/?nivel=baixo", { waitUntil: "networkidle" });
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(600);
  expect(await vivas(page)).toBe(0);
  expect(await page.locator("article[data-name] img").count()).toBeGreaterThan(0);
});

test("médio: nada vivo até a intenção, e o cursor acorda a peça", async ({ page }) => {
  await page.goto("/?nivel=medio", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  expect(await vivas(page), "rolar e olhar não acorda ninguém").toBe(0);

  const ladrilho = page.locator("article[data-name]").nth(1);
  await ladrilho.hover();
  await expect(ladrilho).toHaveAttribute("data-viva", "");

  // Tirar o cursor não devolve pra foto: a troca seria no pior momento.
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  await expect(ladrilho).toHaveAttribute("data-viva", "");
});

test("médio: o teto de vivas segura quem passa o cursor pela grade inteira", async ({ page }) => {
  await page.goto("/?nivel=medio", { waitUntil: "networkidle" });
  const ladrilhos = page.locator("article[data-name]");
  for (let i = 0; i < 10; i++) await ladrilhos.nth(i).hover();
  await page.waitForTimeout(600);
  expect(await vivas(page)).toBeLessThanOrEqual(6);
});
