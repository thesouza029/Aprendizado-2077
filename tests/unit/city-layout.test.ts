import { describe, expect, it } from "vitest";
import {
  CITY,
  TRAFFIC_MIN_HEIGHT,
  buildCityLayout,
  buildTraffic,
  collides,
  collisionBoxes,
  flightLimits,
  resolveMovement,
  destinationsOf,
  distanceToSegment,
  easeInOutCubic,
  flightControlPoint,
  flightDuration,
  quadraticBezier,
  type CityDistrictInput,
} from "@/lib/city-layout";
import { getProjects, getTracks } from "@/lib/content";

const input: CityDistrictInput[] = [
  { id: "library", kind: "library", projects: [] },
  { id: "fundamentos", kind: "track", projects: [{ id: "a", steps: 7 }, { id: "b", steps: 5 }] },
  { id: "web", kind: "track", projects: [{ id: "c", steps: 8 }] },
  { id: "backend", kind: "track", projects: [] },
  { id: "mobile", kind: "track", projects: [] },
  { id: "devops", kind: "track", projects: [] },
  { id: "ia", kind: "track", projects: [] },
];

describe("layout da cidade", () => {
  const layout = buildCityLayout(input);

  it("é determinístico (mesma cidade em toda visita)", () => {
    expect(JSON.stringify(buildCityLayout(input))).toBe(JSON.stringify(layout));
  });

  it("cria um distrito por entrada e um prédio por projeto, com um andar por etapa", () => {
    expect(layout.districts.length).toBe(7);
    const fundamentos = layout.districts.find((d) => d.id === "fundamentos")!;
    expect(fundamentos.buildings.map((b) => b.floors)).toEqual([7, 5]);
    expect(layout.districts.find((d) => d.id === "library")!.landmark !== null).toBe(true);
  });

  it("prédios dos projetos ficam dentro do terreno do distrito", () => {
    for (const d of layout.districts) {
      for (const b of d.buildings) {
        const dist = Math.hypot(b.position[0] - d.center[0], b.position[2] - d.center[2]);
        expect(dist + CITY.buildingSize / 2 <= d.radius).toBe(true);
      }
    }
  });

  it("prédios de enchimento não invadem praça, distritos nem avenidas", () => {
    expect(layout.fillers.length).toBeGreaterThan(100);
    for (const f of layout.fillers) {
      const r = Math.hypot(f.position[0], f.position[2]);
      expect(r > layout.plazaRadius).toBe(true);
      for (const d of layout.districts) {
        expect(Math.hypot(f.position[0] - d.center[0], f.position[2] - d.center[2]) > d.radius).toBe(true);
        expect(distanceToSegment(f.position, [0, 0, 0], d.center) > CITY.roadWidth / 2).toBe(true);
      }
    }
  });

  it("todos os destinos têm id único", () => {
    const ids = destinationsOf(layout);
    // hub + 7 distritos + 3 projetos
    expect(ids.size).toBe(11);
  });
});

describe("pontos de câmera", () => {
  const layout = buildCityLayout(input);
  const boxes = collisionBoxes(layout);

  it("câmera de distrito fica sobre a avenida, entre a praça e o distrito", () => {
    for (const d of layout.districts) {
      const r = Math.hypot(d.view.position[0], d.view.position[2]);
      expect(r > layout.plazaRadius && r < CITY.districtDistance).toBe(true);
      expect(distanceToSegment(d.view.position, [0, 0, 0], d.center) < 1).toBe(true);
    }
  });

  it("nenhum prédio de projeto fica entre a câmera do distrito e o centro dele", () => {
    const many = buildCityLayout([
      { id: "x", kind: "track", projects: Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, steps: 8 })) },
      ...input.slice(1),
    ]);
    for (const d of many.districts) {
      for (const b of d.buildings) {
        const gap = distanceToSegment(b.position, d.view.position, d.center);
        expect(gap > CITY.buildingSize / 2 + 1).toBe(true);
      }
    }
  });

  it("nenhuma câmera nasce dentro de um prédio", () => {
    for (const d of layout.districts) {
      expect(collides(d.view.position, boxes, 1)).toBe(false);
      for (const b of d.buildings) expect(collides(b.view.position, boxes, 1)).toBe(false);
    }
    expect(collides(layout.hub.view.position, boxes, 1)).toBe(false);
    expect(collides(layout.overview.position, boxes, 1)).toBe(false);
  });
});

describe("colisão do voo livre", () => {
  const box = { minX: -5, maxX: 5, minZ: -5, maxZ: 5, maxY: 20 };
  const limits = { radius: 100, minY: 2, maxY: 140, body: 1 };

  it("não atravessa um prédio", () => {
    const next = resolveMovement([-10, 5, 0], [6, 0, 0], [box], limits);
    expect(next).toEqual([-10, 5, 0]);
  });

  it("desliza encostado na parede (bloqueia um eixo, libera o outro)", () => {
    const next = resolveMovement([-7, 5, 0], [2, 0, 3], [box], limits);
    expect(next).toEqual([-7, 5, 3]);
  });

  it("passa por cima de um prédio baixo", () => {
    const next = resolveMovement([-10, 25, 0], [10, 0, 0], [box], limits);
    expect(next).toEqual([0, 25, 0]);
  });

  it("respeita chão, teto e o limite da cidade", () => {
    expect(resolveMovement([50, 3, 0], [0, -10, 0], [], limits)[1]).toBe(2);
    expect(resolveMovement([50, 139, 0], [0, 10, 0], [], limits)[1]).toBe(140);
    const far = resolveMovement([99, 10, 0], [10, 0, 0], [], limits);
    expect(Math.round(Math.hypot(far[0], far[2]))).toBe(100);
  });

  it("se já estiver dentro de algo, consegue sair", () => {
    const next = resolveMovement([0, 5, 0], [8, 0, 0], [box], limits);
    expect(next).toEqual([8, 5, 0]);
  });

  it("limites são calculados a partir do raio da cidade", () => {
    const layout = buildCityLayout(input);
    expect(flightLimits(layout).radius > layout.cityRadius).toBe(true);
  });
});

describe("tráfego aéreo", () => {
  const layout = buildCityLayout(input);

  it("carros voam acima de todos os prédios", () => {
    const tallest = Math.max(
      ...layout.fillers.map((f) => f.size[1]),
      ...layout.districts.flatMap((d) => d.buildings.map((b) => b.height + 2)),
      layout.hub.height + 3,
    );
    expect(TRAFFIC_MIN_HEIGHT > tallest).toBe(true);
    for (const lane of buildTraffic(80, layout)) expect(lane.height >= TRAFFIC_MIN_HEIGHT).toBe(true);
  });

  it("rotas ficam dentro da cidade e são determinísticas", () => {
    const a = buildTraffic(40, layout);
    expect(JSON.stringify(buildTraffic(40, layout))).toBe(JSON.stringify(a));
    for (const lane of a) expect(lane.radius > layout.plazaRadius && lane.radius <= layout.cityRadius + 10).toBe(true);
  });
});

describe("voo da câmera", () => {
  it("easing começa em 0, termina em 1 e passa pelo meio", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it("a curva bezier sai da origem e chega ao destino", () => {
    const from: [number, number, number] = [0, 10, 0];
    const to: [number, number, number] = [100, 20, 50];
    const c = flightControlPoint(from, to);
    expect(quadraticBezier(from, c, to, 0)).toEqual(from);
    expect(quadraticBezier(from, c, to, 1)).toEqual(to);
    expect(c[1] > 20).toBe(true);
  });

  it("duração fica entre 1,5 s e 2,5 s", () => {
    expect(flightDuration([0, 0, 0], [0, 0, 0])).toBe(1.5);
    const mid = flightDuration([0, 0, 0], [100, 0, 0]);
    expect(mid > 1.5 && mid < 2.5).toBe(true);
    expect(flightDuration([0, 0, 0], [5000, 0, 0])).toBe(2.5);
  });
});

describe("cidade com o conteúdo real", () => {
  // mesma montagem da Torre Central: biblioteca primeiro, depois as trilhas na ordem
  const real: CityDistrictInput[] = [
    { id: "library", kind: "library", projects: [] },
    ...getTracks().map((t) => ({
      id: t.id,
      kind: "track" as const,
      projects: getProjects(t.id).map((p) => ({ id: p.id, steps: p.steps.length })),
    })),
  ];
  const layout = buildCityLayout(real);
  const boxes = collisionBoxes(layout);
  const buildings = layout.districts.flatMap((d) => d.buildings);

  it("tem um prédio para cada projeto", () => {
    expect(buildings.length).toBe(getProjects().length);
  });

  it("prédios ficam dentro do terreno e não se encostam", () => {
    for (const d of layout.districts) {
      for (const b of d.buildings) {
        const dist = Math.hypot(b.position[0] - d.center[0], b.position[2] - d.center[2]);
        expect(dist + CITY.buildingSize / 2 <= d.radius).toBe(true);
      }
    }
    for (let i = 0; i < buildings.length; i++) {
      for (let j = i + 1; j < buildings.length; j++) {
        const a = buildings[i]!;
        const b = buildings[j]!;
        expect(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]) > CITY.buildingSize).toBe(true);
      }
    }
  });

  it("a câmera de cada distrito enxerga o centro e não nasce dentro de nada", () => {
    for (const d of layout.districts) {
      expect(collides(d.view.position, boxes, 1)).toBe(false);
      for (const b of d.buildings) {
        expect(distanceToSegment(b.position, d.view.position, d.center) > CITY.buildingSize / 2 + 1).toBe(true);
        expect(collides(b.view.position, boxes, 1)).toBe(false);
      }
    }
  });

  it("carros voam acima do prédio mais alto", () => {
    const tallest = Math.max(...buildings.map((b) => b.height + 2));
    expect(TRAFFIC_MIN_HEIGHT > tallest).toBe(true);
  });
});
