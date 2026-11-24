import type { Preferences } from "./progress";

/**
 * Qualidade gráfica da cidade 3D (lógica pura, testada).
 * O PerformanceMonitor do drei mede o fps e move um "fator" entre 0 (mínimo) e 1 (máximo);
 * daqui saem o nível de detalhe, a resolução e a decisão de trocar a cidade pelo modo 2D.
 */

export type GraphicsTier = "high" | "medium" | "low";

export type TierSettings = {
  /** resolução do reflexo do chão molhado (0 = sem reflexo, que exige desenhar a cena duas vezes) */
  reflector: number;
  /** amostras de antisserrilhado do pós-processamento */
  multisampling: number;
  /** níveis do bloom (menos níveis = brilho mais barato) */
  bloomLevels: number;
  rain: number;
  traffic: number;
  stars: number;
};

export const TIER_SETTINGS: Record<GraphicsTier, TierSettings> = {
  high: { reflector: 512, multisampling: 4, bloomLevels: 7, rain: 1000, traffic: 70, stars: 2000 },
  medium: { reflector: 256, multisampling: 0, bloomLevels: 6, rain: 650, traffic: 50, stars: 1500 },
  low: { reflector: 0, multisampling: 0, bloomLevels: 4, rain: 400, traffic: 30, stars: 1000 },
};

/** Quanto o fator muda a cada ajuste: do máximo ao mínimo em 4 quedas (~10 s de fps ruim) */
export const QUALITY_STEP = 0.25;

export function tierForFactor(factor: number): GraphicsTier {
  if (factor >= 0.75) return "high";
  if (factor >= 0.5) return "medium";
  return "low";
}

/** "Alto" e "Leve" fixam o nível; "Automático" segue o fps */
export function resolveTier(graphics: Preferences["graphics"], factor: number): GraphicsTier {
  if (graphics === "high") return "high";
  if (graphics === "low") return "low";
  return tierForFactor(factor);
}

export type DeviceHints = {
  /** navigator.hardwareConcurrency */
  cores?: number;
  /** navigator.deviceMemory (só no Chrome), em GB */
  memoryGB?: number;
  /** tela de toque como ponteiro principal (celular, tablet) */
  coarse: boolean;
};

/**
 * Ponto de partida antes de medir: aparelhos de toque ou com pouco processador/memória
 * começam no médio ou no leve e sobem sozinhos se o fps permitir.
 */
export function initialQualityFactor({ cores, memoryGB, coarse }: DeviceHints): number {
  const few = (value: number | undefined, limit: number) => value !== undefined && value <= limit;
  if (few(cores, 2) || few(memoryGB, 2)) return 0.25;
  if (coarse || few(cores, 4) || few(memoryGB, 4)) return 0.5;
  return 1;
}

/** Resolução de desenho (devicePixelRatio): até 1.5 no máximo e nunca abaixo de 0.75 */
export function dprFor(graphics: Preferences["graphics"], factor: number, deviceDpr: number): number {
  const max = Math.min(Math.max(deviceDpr, 1), 1.5);
  if (graphics === "high") return max;
  const f = graphics === "low" ? 0 : Math.min(Math.max(factor, 0), 1);
  return Math.round(Math.max(0.75, max * (0.6 + 0.4 * f)) * 100) / 100;
}

/** Não há mais nada para reduzir: nível leve e resolução mínima */
export function isAtMinimum(graphics: Preferences["graphics"], factor: number): boolean {
  if (graphics === "low") return true;
  return graphics === "auto" && factor <= 0;
}

export const FALLBACK = {
  /** segundos ignorados ao abrir a cidade (compilação de shaders deixa os primeiros quadros lentos) */
  warmupSeconds: 5,
  /** cada medição cobre 1 segundo */
  windowSeconds: 1,
  /** abaixo disto, com tudo já no mínimo, por `sustainedWindows` segundos seguidos: 2D */
  minFps: 20,
  sustainedWindows: 6,
  /** abaixo disto por `criticalWindows` segundos, troca mesmo sem ter reduzido tudo */
  criticalFps: 8,
  criticalWindows: 4,
  /** intervalo entre quadros acima disto (aba pausada, travada longa) invalida a medição */
  maxFrameGap: 2,
};

/**
 * A cidade 3D deve dar lugar ao modo 2D? Recebe o fps de cada segundo (mais recente por último).
 * Com tudo no mínimo, basta ficar abaixo de 20 fps por 6 s; fora disso, só se ficar abaixo de 8 fps por 4 s.
 */
export function shouldFallback(history: readonly number[], atMinimum: boolean): boolean {
  const last = (n: number) => (history.length >= n ? history.slice(-n) : null);
  const critical = last(FALLBACK.criticalWindows);
  if (critical?.every((fps) => fps < FALLBACK.criticalFps)) return true;
  const sustained = last(FALLBACK.sustainedWindows);
  return atMinimum && sustained !== null && sustained.every((fps) => fps < FALLBACK.minFps);
}
