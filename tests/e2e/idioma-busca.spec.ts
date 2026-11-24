import { expect, test } from "@playwright/test";
import { MODE_2D, seedProgress } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedProgress(page, MODE_2D);
});

test("trocar para inglês traduz interface e conteúdo", async ({ page }) => {
  await page.goto("/pt/tracks/web/mini-saas");
  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/tracks\/web\/mini-saas$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Booking mini-SaaS with Next.js, PostgreSQL and Stripe");
  await expect(page.getByRole("button", { name: "Mark as done" }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("a escolha de idioma vale para a Torre Central", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome to DevCity" })).toBeVisible();
  await page.getByRole("button", { name: "Português" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bem-vindo à DevCity" })).toBeVisible();
});

test("busca global com Ctrl+K abre um projeto", async ({ page }) => {
  await page.goto("/pt");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Busca global" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("kubernetes terraform");
  const option = dialog.getByRole("option").filter({ hasText: "Introdução a Kubernetes e Terraform" }).first();
  await option.click();
  await expect(page).toHaveURL(/\/pt\/tracks\/devops\/kubernetes-terraform/);
});
