import { readFile, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { MODE_2D, seedProgress } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedProgress(page, MODE_2D);
});

test("marcar uma etapa persiste depois de recarregar", async ({ page }) => {
  await page.goto("/pt/tracks/fundamentos/perfil-dev");
  const first = page.getByRole("button", { name: "Marcar como concluída" }).first();
  await first.click();
  const done = page.getByRole("button", { name: /Concluída/ }).first();
  await expect(done).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByRole("button", { name: /Concluída/ }).first()).toHaveAttribute("aria-pressed", "true");

  // a barra do projeto conta a etapa (1 de 7)
  await expect(page.getByText("1 de 7 etapas").first()).toBeVisible();
});

test("exportar e importar o progresso", async ({ page }, testInfo) => {
  await page.goto("/pt/tracks/fundamentos/perfil-dev");
  await page.getByRole("button", { name: "Marcar como concluída" }).first().click();

  await page.goto("/pt");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar progresso" }).click();
  const download = await downloadPromise;
  const file = testInfo.outputPath("progresso.json");
  await download.saveAs(file);
  const exported = JSON.parse(await readFile(file, "utf8")) as { app: string; data: { completedSteps: Record<string, number> } };
  expect(exported.app).toBe("devcity");
  expect(Object.keys(exported.data.completedSteps).length).toBe(1);

  // apaga tudo e importa de volta
  await page.getByRole("button", { name: "Apagar progresso" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText("Progresso importado com sucesso.")).toBeVisible();

  await page.goto("/pt/tracks/fundamentos/perfil-dev");
  await expect(page.getByRole("button", { name: /Concluída/ }).first()).toHaveAttribute("aria-pressed", "true");
});

test("arquivo que não é da DevCity é recusado", async ({ page }, testInfo) => {
  await page.goto("/pt");
  const file = testInfo.outputPath("outro.json");
  await writeFile(file, JSON.stringify({ qualquer: "coisa" }));
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByText("Esse arquivo não é um backup da DevCity.")).toBeVisible();
});
