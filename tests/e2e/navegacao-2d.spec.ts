import { expect, test } from "@playwright/test";
import { MODE_2D, seedProgress } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedProgress(page, MODE_2D);
});

test("a Torre Central em 2D leva aos distritos", async ({ page }) => {
  await page.goto("/pt");
  await expect(page.getByRole("heading", { level: 1, name: "Bem-vindo à DevCity" })).toBeVisible();
  await page.getByRole("link", { name: "Começar pelos Fundamentos" }).click();
  await expect(page).toHaveURL(/\/pt\/tracks\/fundamentos$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Distrito Fundamentos");
});

test("cada distrito lista todos os projetos da trilha", async ({ page }) => {
  const expected = { fundamentos: 4, web: 5, backend: 7, mobile: 4, devops: 6, ia: 4 };
  for (const [track, count] of Object.entries(expected)) {
    await page.goto(`/pt/tracks/${track}`);
    await expect(page.locator("ol article")).toHaveCount(count);
  }
});

test("a página do projeto mostra as etapas e os recursos", async ({ page }) => {
  await page.goto("/pt/tracks/backend/chat-go");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Go");
  await expect(page.getByRole("button", { name: "Marcar como concluída" })).toHaveCount(8);
  // recursos da biblioteca abrem em nova aba
  await expect(page.locator('a[href="https://go.dev/tour/"]').first()).toBeVisible();
});

test("o cabeçalho leva à biblioteca e de volta à Torre Central", async ({ page }) => {
  await page.goto("/pt/tracks/web");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Arquivo Neon" }).click();
  await expect(page).toHaveURL(/\/pt\/library/);
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Torre Central" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bem-vindo à DevCity" })).toBeVisible();
});

test("rota inexistente mostra a página 404", async ({ page }) => {
  const response = await page.goto("/pt/rua-que-nao-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Rua sem saída" })).toBeVisible();
});
