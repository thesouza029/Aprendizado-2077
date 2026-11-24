/**
 * Layout da cidade 3D: só matemática, sem three.js nem React.
 * Recebe os distritos e projetos e devolve posições, tamanhos e pontos de câmera.
 * Por ser determinístico (gerador pseudoaleatório com semente), a cidade é igual em toda visita.
 */

export type Vec3 = [number, number, number];

export type CityProjectInput = { id: string; steps: number };
export type CityDistrictInput = {
  id: string;
  kind: "library" | "track";
  projects: CityProjectInput[];
};

/** Um ponto de câmera: onde ela fica e para onde olha */
export type Destination = { id: string; position: Vec3; target: Vec3 };

export type BuildingLayout = {
  projectId: string;
  /** centro da base do prédio */
  position: Vec3;
  floors: number;
  height: number;
  view: Destination;
};

export type DistrictLayout = {
  id: string;
  kind: "library" | "track";
  angle: number;
  center: Vec3;
  radius: number;
  signPosition: Vec3;
  buildings: BuildingLayout[];
  /** prédio-marco do distrito (a biblioteca) */
  landmark: { position: Vec3; size: Vec3 } | null;
  road: { from: Vec3; to: Vec3 };
  view: Destination;
};

export type FillerBuilding = { position: Vec3; size: Vec3 };

export type CityLayout = {
  hub: { position: Vec3; height: number; radius: number; view: Destination };
  plazaRadius: number;
  districts: DistrictLayout[];
  fillers: FillerBuilding[];
  overview: Destination;
  cityRadius: number;
};

export const CITY = {
  plazaRadius: 18,
  hubHeight: 42,
  hubRadius: 5,
  districtDistance: 72,
  districtRadius: 20,
  buildingSize: 6,
  floorHeight: 2.2,
  slotDistance: 10,
  cityRadius: 140,
  roadWidth: 6,
} as const;

/** Ângulos dos prédios em relação à direção "para fora" do distrito (0 = fundo, ±135° = laterais da frente) */
const SLOT_OFFSETS = [0, 1, -1, 2, -2, 3, -3].map((k) => (k * Math.PI) / 4);

export const HUB_ID = "hub";
export const OVERVIEW_ID = "overview";
export const districtDestinationId = (id: string) => `district:${id}`;
export const projectDestinationId = (id: string) => `project:${id}`;

/** Gerador pseudoaleatório pequeno e determinístico (mulberry32) */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distância (no plano XZ) de um ponto até um segmento */
export function distanceToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const [px, , pz] = p;
  const [ax, , az] = a;
  const [bx, , bz] = b;
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  const cx = ax + t * dx;
  const cz = az + t * dz;
  return Math.hypot(px - cx, pz - cz);
}

const round = (n: number) => Math.round(n * 100) / 100;
const v = (x: number, y: number, z: number): Vec3 => [round(x), round(y), round(z)];

export function buildCityLayout(districtsInput: CityDistrictInput[], seed = 2026): CityLayout {
  const n = districtsInput.length;

  const districts: DistrictLayout[] = districtsInput.map((input, i) => {
    // anel no sentido horário, girado meio passo para nenhum distrito ficar exatamente
    // atrás da Torre Central na visão geral (os letreiros se sobreporiam)
    const angle = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const cx = dx * CITY.districtDistance;
    const cz = dz * CITY.districtDistance;
    const center = v(cx, 0, cz);

    // prédios dos projetos em leque ao redor do centro: o lado da praça fica livre,
    // porque é por ali que a câmera chega (pela avenida)
    const buildings: BuildingLayout[] = input.projects.map((project, k) => {
      const ring = Math.floor(k / SLOT_OFFSETS.length);
      const slot = k % SLOT_OFFSETS.length;
      const dist = CITY.slotDistance + ring * 6;
      const theta = angle + SLOT_OFFSETS[slot]!;
      const bx = cx + Math.cos(theta) * dist;
      const bz = cz + Math.sin(theta) * dist;
      const floors = Math.max(1, project.steps);
      const height = floors * CITY.floorHeight;
      // câmera chega pelo lado da praça (onde não há prédios decorativos), alta o bastante
      // para enxergar por cima dos vizinhos; o alvo vai um pouco para a direita para o
      // prédio aparecer à esquerda do painel lateral
      const len = Math.hypot(bx, bz) || 1;
      const fx = bx / len; // "para fora" (da praça para o prédio)
      const fz = bz / len;
      return {
        projectId: project.id,
        position: v(bx, 0, bz),
        floors,
        height: round(height),
        view: {
          id: projectDestinationId(project.id),
          position: v(bx - fx * 18, height + 14, bz - fz * 18),
          target: v(bx - fz * 4, height * 0.45, bz + fx * 4),
        },
      };
    });

    const landmark =
      input.kind === "library" ? { position: center, size: v(16, 14, 11) } : null;

    return {
      id: input.id,
      kind: input.kind,
      angle: round(angle),
      center,
      radius: CITY.districtRadius,
      signPosition: v(cx, input.kind === "library" ? 22 : 26, cz),
      buildings,
      landmark,
      road: {
        from: v(dx * CITY.plazaRadius, 0, dz * CITY.plazaRadius),
        to: v(dx * (CITY.districtDistance - CITY.districtRadius), 0, dz * (CITY.districtDistance - CITY.districtRadius)),
      },
      // câmera sobre a avenida (sempre livre), olhando para fora; alvo deslocado para a
      // direita da câmera para o distrito ficar à esquerda do painel
      view: {
        id: districtDestinationId(input.id),
        position: v(cx - dx * 40, 30, cz - dz * 40),
        // alvo um pouco acima do chão para o letreiro do distrito caber no quadro
        target: v(cx - dz * 7, 12, cz + dx * 7),
      },
    };
  });

  // prédios de enchimento (decorativos), fora da praça, dos distritos e das avenidas
  const rand = seededRandom(seed);
  const fillers: FillerBuilding[] = [];
  const step = 11;
  for (let x = -CITY.cityRadius; x <= CITY.cityRadius; x += step) {
    for (let z = -CITY.cityRadius; z <= CITY.cityRadius; z += step) {
      const px = x + (rand() - 0.5) * 5;
      const pz = z + (rand() - 0.5) * 5;
      const w = 4 + rand() * 4;
      const d = 4 + rand() * 4;
      const r = Math.hypot(px, pz);
      const h = 4 + rand() * (8 + (r / CITY.cityRadius) * 26);
      const footprint = Math.max(w, d) / 2;
      if (r > CITY.cityRadius || r < CITY.plazaRadius + 10 + footprint) continue;
      const p = v(px, 0, pz);
      const blocked = districts.some(
        (dst) =>
          Math.hypot(px - dst.center[0], pz - dst.center[2]) < dst.radius + 5 + footprint ||
          distanceToSegment(p, [0, 0, 0], dst.center) < CITY.roadWidth / 2 + 3 + footprint,
      );
      if (blocked) continue;
      fillers.push({ position: p, size: v(w, h, d) });
    }
  }

  return {
    hub: {
      position: [0, 0, 0],
      height: CITY.hubHeight,
      radius: CITY.hubRadius,
      view: { id: HUB_ID, position: [0, 30, 52], target: [0, 18, 0] },
    },
    plazaRadius: CITY.plazaRadius,
    districts,
    fillers,
    overview: { id: OVERVIEW_ID, position: [0, 110, 170], target: [0, 0, 10] },
    cityRadius: CITY.cityRadius,
  };
}

/** Todos os destinos navegáveis, indexados por id */
export function destinationsOf(layout: CityLayout): Map<string, Destination> {
  const map = new Map<string, Destination>();
  map.set(layout.hub.view.id, layout.hub.view);
  for (const d of layout.districts) {
    map.set(d.view.id, d.view);
    for (const b of d.buildings) map.set(b.view.id, b.view);
  }
  return map;
}

// ---------- Voo da câmera ----------

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Ponto numa curva bezier quadrática */
export function quadraticBezier(p0: Vec3, c: Vec3, p1: Vec3, t: number): Vec3 {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    u * u * p0[2] + 2 * u * t * c[2] + t * t * p1[2],
  ];
}

/** Ponto de controle: meio do caminho, elevado para a câmera "subir" por cima da cidade */
export function flightControlPoint(from: Vec3, to: Vec3): Vec3 {
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  return [
    (from[0] + to[0]) / 2,
    Math.max(from[1], to[1]) + Math.min(60, dist * 0.35),
    (from[2] + to[2]) / 2,
  ];
}

/** Duração do voo entre 1,5 s e 2,5 s, proporcional à distância */
export function flightDuration(from: Vec3, to: Vec3): number {
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  return Math.min(2.5, Math.max(1.5, 1.5 + dist / 200));
}

// ---------- Colisão (voo livre) ----------

/** Caixa de colisão no plano XZ, do chão até maxY */
export type CollisionBox = { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number };

export type FlightLimits = { radius: number; minY: number; maxY: number; body: number };

export function flightLimits(layout: CityLayout): FlightLimits {
  return { radius: layout.cityRadius * 1.15, minY: 2, maxY: 140, body: 1.2 };
}

/** Todas as construções que a câmera não pode atravessar */
export function collisionBoxes(layout: CityLayout): CollisionBox[] {
  const boxes: CollisionBox[] = [];
  const add = (x: number, z: number, w: number, d: number, h: number) =>
    boxes.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, maxY: h });

  const hub = layout.hub;
  add(hub.position[0], hub.position[2], hub.radius * 2, hub.radius * 2, hub.height + 3);
  for (const f of layout.fillers) add(f.position[0], f.position[2], f.size[0], f.size[2], f.size[1]);
  for (const d of layout.districts) {
    if (d.landmark) {
      // o marco gira para encarar a praça: usa um quadrado que cobre qualquer rotação
      const [w, h, dep] = d.landmark.size;
      const side = Math.hypot(w, dep);
      add(d.landmark.position[0], d.landmark.position[2], side, side, h);
    }
    for (const b of d.buildings) {
      add(b.position[0], b.position[2], CITY.buildingSize, CITY.buildingSize, b.height + 1.5);
    }
  }
  return boxes;
}

export function collides(p: Vec3, boxes: CollisionBox[], body: number): boolean {
  return boxes.some(
    (b) =>
      p[1] < b.maxY + body &&
      p[0] > b.minX - body &&
      p[0] < b.maxX + body &&
      p[2] > b.minZ - body &&
      p[2] < b.maxZ + body,
  );
}

/**
 * Aplica um deslocamento respeitando prédios e limites da cidade.
 * Testa eixo por eixo, então a câmera "desliza" encostada nas paredes em vez de travar.
 * Se já estiver dentro de algo (ex.: posição salva antiga), deixa sair livremente.
 */
export function resolveMovement(
  pos: Vec3,
  delta: Vec3,
  boxes: CollisionBox[],
  limits: FlightLimits,
): Vec3 {
  let [x, y, z] = pos;
  const stuck = collides(pos, boxes, limits.body);
  const free = (p: Vec3) => stuck || !collides(p, boxes, limits.body);

  if (free([x + delta[0], y, z])) x += delta[0];
  if (free([x, y, z + delta[2]])) z += delta[2];
  const ny = Math.min(limits.maxY, Math.max(limits.minY, y + delta[1]));
  if (free([x, ny, z])) y = ny;

  const r = Math.hypot(x, z);
  if (r > limits.radius) {
    x *= limits.radius / r;
    z *= limits.radius / r;
  }
  return [x, y, z];
}

// ---------- Letreiros ----------

export type LabelAnchor = { id: string; kind: "hub" | "district" | "project"; position: Vec3 };

/** Onde fica cada letreiro flutuante (id igual ao do destino correspondente) */
export function labelAnchors(layout: CityLayout): LabelAnchor[] {
  const anchors: LabelAnchor[] = [
    { id: layout.hub.view.id, kind: "hub", position: [0, layout.hub.height + 7, 0] },
  ];
  for (const d of layout.districts) {
    anchors.push({ id: d.view.id, kind: "district", position: d.signPosition });
    for (const b of d.buildings) {
      anchors.push({
        id: b.view.id,
        kind: "project",
        position: [b.position[0], b.height + 4, b.position[2]],
      });
    }
  }
  return anchors;
}

// ---------- Tráfego aéreo (decoração) ----------

export type TrafficLane = {
  radius: number;
  height: number;
  /** radianos por segundo */
  speed: number;
  phase: number;
  /** 1 = anti-horário, −1 = horário */
  direction: 1 | -1;
  colorIndex: number;
};

export const TRAFFIC_MIN_HEIGHT = 48;

/** Rotas circulares dos carros voadores, sempre acima de todos os prédios */
export function buildTraffic(count: number, layout: CityLayout, seed = 7): TrafficLane[] {
  const rand = seededRandom(seed);
  const lanes: TrafficLane[] = [];
  for (let i = 0; i < count; i++) {
    lanes.push({
      radius: round(layout.plazaRadius + 10 + rand() * (layout.cityRadius - layout.plazaRadius)),
      height: round(TRAFFIC_MIN_HEIGHT + rand() * 26),
      speed: round(0.05 + rand() * 0.12),
      phase: round(rand() * Math.PI * 2),
      direction: rand() > 0.5 ? 1 : -1,
      colorIndex: Math.floor(rand() * 5),
    });
  }
  return lanes;
}
