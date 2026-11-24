import type { Page } from "@playwright/test";

/**
 * Grava o progresso inicial no localStorage antes da primeira carga da aba.
 * Só na primeira: recarregar a página não pode apagar o que o teste fez.
 */
export async function seedProgress(page: Page, state: Record<string, unknown>) {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("e2e-seeded")) return;
    sessionStorage.setItem("e2e-seeded", "1");
    localStorage.setItem("devcity-progress", JSON.stringify({ state: value, version: 1 }));
  }, state);
}

/** Abre a Torre Central já no modo 2D (sem WebGL envolvido) */
export const MODE_2D = { preferences: { viewMode: "2d" } };

/** Força a cidade 3D (sem som e sem eventos no céu, para o teste ser previsível) */
export const MODE_3D = { preferences: { viewMode: "3d", navMode: "travel", sound: false, skyEvents: false, rain: false } };
