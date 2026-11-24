import { expect, test, type Page } from "@playwright/test";
import { MODE_3D, seedProgress } from "./helpers";

const NO_WEBGL = "Seu navegador não consegue desenhar 3D (WebGL), então a DevCity está no modo 2D.";

/** Abre a cidade; se o navegador de teste não tiver WebGL, pula o teste em vez de falhar */
async function openCity(page: Page) {
  await page.goto("/pt");
  const notice = page.getByText(NO_WEBGL);
  const hud = page.getByRole("button", { name: /Modo Viagem/ });
  await expect(notice.or(hud)).toBeVisible({ timeout: 30_000 });
  test.skip(await notice.isVisible(), "Este navegador de teste não tem WebGL");
}

test.describe("cidade 3D", () => {
  test.beforeEach(async ({ page }) => {
    await seedProgress(page, MODE_3D);
  });

  test("modo Viagem: escolher um destino voa até ele e abre o painel", async ({ page }) => {
    await openCity(page);
    await page.getByRole("button", { name: "Viajar para Distrito Web", exact: true }).click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByRole("heading", { name: "Distrito Web" })).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByRole("link", { name: "Abrir página do distrito" })).toBeVisible();
    await panel.getByRole("button", { name: "Fechar painel" }).click();
    await expect(panel).toBeHidden();
  });

  test("do painel do distrito dá para abrir a página da trilha", async ({ page }) => {
    await openCity(page);
    await page.getByRole("button", { name: "Viajar para Distrito Backend", exact: true }).click();
    const panel = page.getByRole("dialog");
    await panel.getByRole("link", { name: "Abrir página do distrito" }).click({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/pt\/tracks\/backend$/);
    await expect(page.locator("ol article")).toHaveCount(7);
  });

  test("a tecla F alterna entre Viagem e voo livre", async ({ page, isMobile }) => {
    test.skip(isMobile, "teclado é coisa do desktop");
    await openCity(page);
    await page.keyboard.press("f");
    await expect(page.getByRole("button", { name: /Voo livre/ })).toBeVisible();
    await page.keyboard.press("f");
    await expect(page.getByRole("button", { name: /Modo Viagem/ })).toBeVisible();
  });

  test("no celular, o voo livre mostra o joystick", async ({ page, isMobile }) => {
    test.skip(!isMobile, "só no celular");
    await openCity(page);
    await page.getByRole("button", { name: /Modo Viagem/ }).click();
    await expect(page.getByRole("img", { name: "Joystick de movimento" })).toBeVisible();
  });

  test("o botão Modo 2D troca para a versão 2D", async ({ page }) => {
    await openCity(page);
    await page.getByRole("button", { name: "Modo 2D", exact: true }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Bem-vindo à DevCity" })).toBeVisible();
  });
});

test("sem WebGL, a Torre Central abre em 2D com aviso", async ({ page }) => {
  await seedProgress(page, { preferences: { viewMode: "auto" } });
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype as unknown as {
      getContext: (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
    };
    const original = proto.getContext;
    proto.getContext = function (type, ...rest) {
      if (type.startsWith("webgl")) return null;
      return original.call(this, type, ...rest);
    };
  });
  await page.goto("/pt");
  await expect(page.getByText(NO_WEBGL)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Bem-vindo à DevCity" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
});
