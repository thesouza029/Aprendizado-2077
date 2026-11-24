"use client";

type DevTools = Record<string, (...args: never[]) => unknown>;
type DevWindow = Window & { __devcity?: DevTools };

/**
 * Ferramentas de teste no console, só em desenvolvimento (npm run dev):
 * window.__devcity.sky("blimp") dispara um evento no céu; window.__devcity.quality() mostra o fps/qualidade.
 * Em produção não registra nada. Devolve a função que remove a ferramenta.
 */
export function registerDevTool(name: string, tool: (...args: never[]) => unknown): () => void {
  if (process.env.NODE_ENV !== "development") return () => {};
  const w = window as DevWindow;
  w.__devcity = { ...w.__devcity, [name]: tool };
  return () => {
    if (w.__devcity) delete w.__devcity[name];
  };
}
