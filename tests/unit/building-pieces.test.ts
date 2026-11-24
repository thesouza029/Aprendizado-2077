import { describe, expect, it } from "vitest";
import { neonPieces, pieceGlow, solidPieces } from "@/lib/building-pieces";
import { CITY, buildCityLayout, type CityDistrictInput } from "@/lib/city-layout";

const input: CityDistrictInput[] = [
  { id: "library", kind: "library", projects: [] },
  { id: "fundamentos", kind: "track", projects: [{ id: "a", steps: 7 }, { id: "b", steps: 5 }] },
  { id: "web", kind: "track", projects: [{ id: "c", steps: 3 }] },
];
const layout = buildCityLayout(input);
const district = layout.districts.find((d) => d.id === "fundamentos")!;
const { buildings, center } = district;

describe("peças dos prédios", () => {
  it("de perto: um vidro por andar + tampa", () => {
    const pieces = solidPieces(buildings, center, "high");
    expect(pieces.length).toBe(7 + 1 + 5 + 1);
    expect(pieces.filter((p) => p.kind === "glass" && p.building === 0).length).toBe(7);
  });

  it("de longe: uma torre por prédio", () => {
    const pieces = solidPieces(buildings, center, "low");
    expect(pieces.length).toBe(2);
    expect(pieces.every((p) => p.kind === "tower")).toBe(true);
  });

  it("neon: uma faixa por andar + letreiro", () => {
    const pieces = neonPieces(buildings, center);
    expect(pieces.length).toBe(7 + 1 + 5 + 1);
    expect(pieces.filter((p) => p.kind === "sign").length).toBe(2);
  });

  it("peças ficam relativas ao centro do distrito, sobre o prédio certo", () => {
    for (const piece of solidPieces(buildings, center, "high")) {
      const b = buildings[piece.building]!;
      expect(Math.abs(piece.position[0] + center[0] - b.position[0]) < 0.01).toBe(true);
      expect(Math.abs(piece.position[2] + center[2] - b.position[2]) < 0.01).toBe(true);
    }
  });

  it("andares empilhados do chão ao telhado, e a torre tem a mesma altura", () => {
    const b = buildings[0]!;
    const glass = solidPieces([b], [0, 0, 0], "high").filter((p) => p.kind === "glass");
    const top = glass[glass.length - 1]!;
    expect(Math.abs(top.position[1] + top.scale[1] / 2 - b.height) < CITY.floorHeight * 0.1).toBe(true);
    const tower = solidPieces([b], [0, 0, 0], "low")[0]!;
    expect(Math.abs(tower.position[1] * 2 - tower.scale[1]) < 0.01).toBe(true);
    expect(tower.scale[1] > b.height).toBe(true);
  });
});

describe("brilho das peças", () => {
  const band = (floor: number) => neonPieces(buildings, center).find((p) => p.kind === "band" && p.building === 1 && p.floor === floor)!;
  const sign = neonPieces(buildings, center).find((p) => p.kind === "sign" && p.building === 1)!;
  const lit = [true, true, false, false, false];

  it("faixa de andar concluído acende acima de 1 (bloom)", () => {
    expect(pieceGlow(band(0), lit, false).accent > 1).toBe(true);
    expect(pieceGlow(band(2), lit, false).accent < 1).toBe(true);
  });

  it("realce deixa as faixas apagadas mais visíveis", () => {
    expect(pieceGlow(band(2), lit, true).accent > pieceGlow(band(2), lit, false).accent).toBe(true);
  });

  it("letreiro só acende com o projeto completo", () => {
    expect(pieceGlow(sign, lit, false).accent < 1).toBe(true);
    expect(pieceGlow(sign, [true, true, true, true, true], false).accent > 1).toBe(true);
  });

  it("torre de longe brilha na proporção dos andares concluídos", () => {
    const tower = solidPieces(buildings, center, "low")[1]!;
    const none = pieceGlow(tower, [false, false, false, false, false], false).accent;
    const some = pieceGlow(tower, lit, false).accent;
    const all = pieceGlow(tower, [true, true, true, true, true], false).accent;
    expect(none).toBe(0);
    expect(some > none && all > some).toBe(true);
  });
});
