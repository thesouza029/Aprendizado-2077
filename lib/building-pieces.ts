import { CITY, type BuildingLayout, type Vec3 } from "./city-layout";

/**
 * Prédios de projeto montados em peças modulares (lógica pura, testada).
 * Cada peça vira uma instância de um InstancedMesh: um distrito inteiro custa
 * duas chamadas de desenho (vidro + neon), em vez de duas por andar de cada prédio.
 */

export type BuildingDetail = "high" | "low";

export type PieceKind =
  /** andar de vidro (detalhe alto) */
  | "glass"
  /** tampa escura do telhado (detalhe alto) */
  | "cap"
  /** torre de vidro inteira, sem divisão de andares (detalhe baixo, visto de longe) */
  | "tower"
  /** faixa neon de um andar */
  | "band"
  /** letreiro do topo */
  | "sign";

export type BuildingPiece = {
  /** índice do prédio na lista recebida */
  building: number;
  kind: PieceKind;
  /** andar (etapa) da peça; -1 para peças do prédio inteiro */
  floor: number;
  /** centro da peça, relativo à origem recebida */
  position: Vec3;
  /** a geometria é um cubo de lado 1, esticado por esta escala */
  scale: Vec3;
};

const r = (n: number) => Math.round(n * 1000) / 1000;

/** Peças iluminadas pela cena (vidro): por andar de perto, uma torre só de longe */
export function solidPieces(
  buildings: readonly BuildingLayout[],
  origin: Vec3,
  detail: BuildingDetail,
): BuildingPiece[] {
  const s = CITY.buildingSize;
  const h = CITY.floorHeight;
  const pieces: BuildingPiece[] = [];
  buildings.forEach((b, building) => {
    const x = r(b.position[0] - origin[0]);
    const z = r(b.position[2] - origin[2]);
    if (detail === "low") {
      const height = b.height + 0.2;
      pieces.push({ building, kind: "tower", floor: -1, position: [x, r(height / 2), z], scale: [s, r(height), s] });
      return;
    }
    for (let floor = 0; floor < b.floors; floor++) {
      pieces.push({
        building,
        kind: "glass",
        floor,
        position: [x, r(floor * h + h / 2), z],
        scale: [s, r(h * 0.92), s],
      });
    }
    pieces.push({ building, kind: "cap", floor: -1, position: [x, r(b.height + 0.1), z], scale: [s, 0.2, s] });
  });
  return pieces;
}

/** Peças neon (sem iluminação, brilham com o bloom): faixa de cada andar e letreiro */
export function neonPieces(buildings: readonly BuildingLayout[], origin: Vec3): BuildingPiece[] {
  const s = CITY.buildingSize;
  const h = CITY.floorHeight;
  const pieces: BuildingPiece[] = [];
  buildings.forEach((b, building) => {
    const x = r(b.position[0] - origin[0]);
    const z = r(b.position[2] - origin[2]);
    for (let floor = 0; floor < b.floors; floor++) {
      pieces.push({
        building,
        kind: "band",
        floor,
        position: [x, r(floor * h + h * 0.96), z],
        scale: [r(s * 1.04), 0.16, r(s * 1.04)],
      });
    }
    pieces.push({ building, kind: "sign", floor: -1, position: [x, r(b.height + 0.9), z], scale: [r(s * 0.8), 1.2, 0.4] });
  });
  return pieces;
}

export type PieceGlow = {
  /** multiplicador da cor do distrito (acima de 1, o bloom pega) */
  accent: number;
  /** soma o azul-escuro de "apagado" por baixo, para a peça não sumir no escuro */
  base: boolean;
};

/**
 * Quanto cada peça brilha: andar concluído acende a faixa e o vidro; projeto completo
 * acende o letreiro; passar o mouse (ou estar com o painel aberto) realça tudo de leve.
 */
export function pieceGlow(piece: BuildingPiece, floorsLit: readonly boolean[], highlight: boolean): PieceGlow {
  const lit = piece.floor >= 0 && floorsLit[piece.floor] === true;
  switch (piece.kind) {
    case "glass":
      return { accent: lit ? 0.45 : highlight ? 0.08 : 0, base: false };
    case "cap":
      return { accent: 0, base: false };
    case "tower": {
      const share = floorsLit.length ? floorsLit.filter(Boolean).length / floorsLit.length : 0;
      return { accent: 0.45 * share + (highlight ? 0.08 : 0), base: false };
    }
    case "band":
      return lit ? { accent: 3.5, base: false } : { accent: highlight ? 0.8 : 0.35, base: true };
    case "sign": {
      const complete = floorsLit.length > 0 && floorsLit.every(Boolean);
      return complete ? { accent: 5, base: false } : { accent: highlight ? 0.6 : 0.05, base: true };
    }
  }
}
