import { expect, test } from "@playwright/test";
import { MODE_2D, seedProgress } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedProgress(page, MODE_2D);
});

test("filtrar por tecnologia mostra só recursos dela", async ({ page }) => {
  await page.goto("/pt/library");
  await page.getByLabel("Tecnologia").selectOption("docker");
  const cards = page.locator("ul article");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < count; i++) await expect(cards.nth(i)).toContainText("Docker");
});

test("a busca acha recursos mesmo com erro de digitação", async ({ page }) => {
  await page.goto("/pt/library");
  await page.getByLabel("Buscar na biblioteca").fill("kubernets");
  await expect(page.locator("ul article").first()).toContainText(/Kubernetes/i);
});

test("marcar \"Quero ver\" persiste e aparece em Minha lista", async ({ page }) => {
  await page.goto("/pt/library");
  const first = page.locator("ul article").first();
  const title = (await first.getByRole("heading").textContent())?.trim() ?? "";
  await first.getByRole("button", { name: "Quero ver" }).click();
  await expect(first.getByRole("button", { name: "Quero ver" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.getByLabel("Minha lista").selectOption("want");
  await expect(page.locator("ul article")).toHaveCount(1);
  await expect(page.locator("ul article").first()).toContainText(title);
});

test("todos os links da biblioteca são https", async ({ page }) => {
  await page.goto("/pt/library");
  const hrefs = await page.locator("ul article a[target=_blank]").evaluateAll((links) =>
    links.map((a) => (a as HTMLAnchorElement).href),
  );
  expect(hrefs.length).toBeGreaterThan(200);
  for (const href of hrefs) expect(href.startsWith("https://")).toBe(true);
});
