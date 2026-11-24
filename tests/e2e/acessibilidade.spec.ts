import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { MODE_2D, seedProgress } from "./helpers";

/** Páginas do modo 2D auditadas com axe (as mesmas regras de WCAG que o Lighthouse usa) */
const pages = [
  "/pt",
  "/pt/library",
  "/pt/tracks/web",
  "/pt/tracks/web/mini-saas",
  "/en/tracks/ia/rag-pdfs",
  "/pt/rua-que-nao-existe",
];

test.beforeEach(async ({ page }) => {
  await seedProgress(page, MODE_2D);
});

for (const path of pages) {
  test(`sem problemas sérios de acessibilidade em ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });
}
