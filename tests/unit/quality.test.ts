import { describe, expect, it } from "vitest";
import {
  FALLBACK,
  QUALITY_STEP,
  TIER_SETTINGS,
  dprFor,
  initialQualityFactor,
  isAtMinimum,
  resolveTier,
  shouldFallback,
  tierForFactor,
} from "@/lib/quality";

describe("qualidade gráfica", () => {
  it("o fator vira nível alto, médio ou leve", () => {
    expect(tierForFactor(1)).toBe("high");
    expect(tierForFactor(0.75)).toBe("high");
    expect(tierForFactor(0.5)).toBe("medium");
    expect(tierForFactor(0.25)).toBe("low");
    expect(tierForFactor(0)).toBe("low");
  });

  it("do máximo ao mínimo em 4 quedas", () => {
    expect(1 - 4 * QUALITY_STEP).toBe(0);
  });

  it("Alto e Leve fixam o nível; Automático segue o fps", () => {
    expect(resolveTier("high", 0)).toBe("high");
    expect(resolveTier("low", 1)).toBe("low");
    expect(resolveTier("auto", 0.5)).toBe("medium");
  });

  it("níveis mais leves custam menos em tudo", () => {
    const { high, medium, low } = TIER_SETTINGS;
    for (const key of ["reflector", "bloomLevels", "rain", "traffic", "stars"] as const) {
      expect(high[key] > medium[key] && medium[key] > low[key]).toBe(true);
    }
    expect(low.reflector).toBe(0);
  });

  it("a chuva ficou mais fraca que antes (3000 gotas)", () => {
    expect(TIER_SETTINGS.high.rain <= 1000).toBe(true);
  });

  it("aparelhos de toque ou fracos começam mais leves", () => {
    expect(initialQualityFactor({ cores: 8, memoryGB: 8, coarse: false })).toBe(1);
    expect(initialQualityFactor({ coarse: false })).toBe(1);
    expect(initialQualityFactor({ cores: 8, coarse: true })).toBe(0.5);
    expect(initialQualityFactor({ cores: 4, coarse: false })).toBe(0.5);
    expect(initialQualityFactor({ cores: 8, memoryGB: 2, coarse: false })).toBe(0.25);
  });

  it("resolução entre 0.75 e 1.5, menor quando o fator cai", () => {
    expect(dprFor("high", 0, 2)).toBe(1.5);
    expect(dprFor("auto", 1, 2)).toBe(1.5);
    expect(dprFor("auto", 1, 1)).toBe(1);
    expect(dprFor("auto", 0.5, 1)).toBe(0.8);
    expect(dprFor("auto", 0, 1)).toBe(0.75);
    expect(dprFor("low", 1, 3)).toBe(0.9);
    expect(dprFor("auto", 0.5, 2) < dprFor("auto", 1, 2)).toBe(true);
  });

  it("só está no mínimo no Leve ou no Automático com fator zero", () => {
    expect(isAtMinimum("low", 1)).toBe(true);
    expect(isAtMinimum("auto", 0)).toBe(true);
    expect(isAtMinimum("auto", 0.25)).toBe(false);
    expect(isAtMinimum("high", 0)).toBe(false);
  });
});

describe("troca automática para o 2D", () => {
  const slow = Array(FALLBACK.sustainedWindows).fill(15);

  it("fps baixo com tudo no mínimo: troca", () => {
    expect(shouldFallback(slow, true)).toBe(true);
  });

  it("fps baixo mas ainda dá para reduzir: espera o monitor reduzir", () => {
    expect(shouldFallback(slow, false)).toBe(false);
  });

  it("um segundo bom no meio cancela", () => {
    expect(shouldFallback([15, 15, 15, 45, 15, 15], true)).toBe(false);
  });

  it("poucas medições ainda não bastam", () => {
    expect(shouldFallback([15, 15, 15], true)).toBe(false);
  });

  it("travando de verdade (menos de 8 fps): troca mesmo sem estar no mínimo", () => {
    expect(shouldFallback([30, 5, 4, 6, 3], false)).toBe(true);
  });

  it("fps bom nunca troca", () => {
    expect(shouldFallback(Array(10).fill(58), true)).toBe(false);
  });
});
