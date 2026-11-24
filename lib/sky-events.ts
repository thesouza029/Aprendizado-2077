import { seededRandom, type Vec3 } from "./city-layout";

/**
 * Eventos aleatórios no céu da cidade (lógica pura, testada): qual evento acontece, quando,
 * e por onde passa. O trajeto é escolhido para cruzar o que a câmera está vendo agora;
 * se nada couber na visão, um evento longo cruza a cidade por cima.
 */

export type SkyEventKind = "meteor" | "meteorShower" | "blimp" | "drones" | "cargo" | "aurora";

export type SkyEvent = {
  id: number;
  kind: SkyEventKind;
  /** onde aparece e onde some (na aurora, as duas pontas do arco) */
  start: Vec3;
  end: Vec3;
  /** centro do arco da aurora; null nos outros eventos */
  pivot: Vec3 | null;
  /** segundos */
  duration: number;
  /** semente dos detalhes visuais (mensagem do painel, cores, atrasos da chuva de meteoros) */
  seed: number;
};

export type CameraView = {
  position: Vec3;
  /** direção para onde a câmera olha (vetor unitário) */
  forward: Vec3;
  /** campo de visão vertical em graus, como na PerspectiveCamera */
  fov: number;
  aspect: number;
};

type KindSpec = {
  /** chance relativa de ser sorteado */
  weight: number;
  duration: readonly [number, number];
  /** faixa de altura (y) do ponto central do trajeto */
  altitude: readonly [number, number];
  /** abaixo desta altura, só além do horizonte (sem prédios embaixo): um meteoro baixo sobre a cidade pareceria errado */
  clearance: number;
  /** distâncias da câmera testadas para o ponto central */
  distances: readonly number[];
  /** comprimento do trajeto */
  length: number;
  /** quanto desce do começo ao fim (meteoros caem na diagonal) */
  descent: number;
  /** eventos longos não acontecem dois ao mesmo tempo */
  long: boolean;
  /** pode cruzar a cidade por cima quando não cabe na visão da câmera */
  worldFallback: boolean;
};

export const SKY_KINDS: Record<SkyEventKind, KindSpec> = {
  meteor: { weight: 3, duration: [1.4, 2], altitude: [40, 280], clearance: 150, distances: [300, 350, 400], length: 150, descent: 50, long: false, worldFallback: false },
  meteorShower: { weight: 1, duration: [6, 8], altitude: [40, 280], clearance: 150, distances: [300, 350, 400], length: 150, descent: 50, long: false, worldFallback: false },
  // acima dos carros voadores (48 a 74), para ninguém atravessar o dirigível
  blimp: { weight: 2, duration: [44, 52], altitude: [78, 100], clearance: 0, distances: [160, 220, 280, 120], length: 320, descent: 0, long: true, worldFallback: true },
  drones: { weight: 2, duration: [24, 28], altitude: [62, 96], clearance: 0, distances: [100, 140, 190, 240], length: 300, descent: 0, long: true, worldFallback: true },
  cargo: { weight: 2, duration: [34, 40], altitude: [80, 130], clearance: 0, distances: [180, 240, 300, 130], length: 400, descent: 0, long: true, worldFallback: true },
  aurora: { weight: 1, duration: [22, 28], altitude: [60, 210], clearance: 140, distances: [300, 360], length: 0, descent: 0, long: true, worldFallback: false },
};

export const SKY_EVENT_KINDS = Object.keys(SKY_KINDS) as SkyEventKind[];

export const SKY_TIMING = {
  /** primeiro evento logo depois de abrir a cidade */
  first: [6, 12] as const,
  /** intervalo entre um evento e o próximo */
  between: [20, 45] as const,
  /** nada coube agora (ex.: um evento longo já está no céu): tenta de novo em pouco tempo */
  retry: 6,
};

/** O céu é uma esfera de raio 450: nada passa além disto a partir do centro da cidade */
export const SKY_LIMIT = 400;

/** Além desta distância do centro não há chão nem prédios: algo baixo ali aparece no horizonte */
export const HORIZON_DISTANCE = 230;

/** Altura permitida para o ponto central: alto o bastante, ou longe o bastante da cidade */
export function clearsCity(kind: SkyEventKind, mid: Vec3): boolean {
  return mid[1] >= SKY_KINDS[kind].clearance || Math.hypot(mid[0], mid[2]) >= HORIZON_DISTANCE;
}

/** Mensagens do painel holográfico do dirigível */
export const BLIMP_MESSAGES = [
  "HELLO, WORLD",
  "git push origin main",
  "npm run dev",
  "console.log('neon')",
  "<DevCity />",
  "while (alive) learn()",
  "404: sleep not found",
  "SELECT * FROM dreams;",
] as const;

const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function nextSkyDelay(rand: () => number, first = false): number {
  const [lo, hi] = first ? SKY_TIMING.first : SKY_TIMING.between;
  return lerp(lo, hi, rand());
}

function pickWeighted(rand: () => number, kinds: readonly SkyEventKind[]): SkyEventKind {
  const total = kinds.reduce((sum, k) => sum + SKY_KINDS[k].weight, 0);
  let roll = rand() * total;
  for (const kind of kinds) {
    roll -= SKY_KINDS[kind].weight;
    if (roll < 0) return kind;
  }
  return kinds[kinds.length - 1]!;
}

type Placement = { mid: Vec3; heading: number; pivot: Vec3 | null };

/**
 * Procura um ponto central para o evento dentro do que a câmera vê (com margem nas bordas)
 * e na faixa de altura do evento. null se não couber: câmera olhando para o chão, por exemplo.
 */
export function placeInView(kind: SkyEventKind, rand: () => number, camera: CameraView): Placement | null {
  const spec = SKY_KINDS[kind];
  const [cx, cy, cz] = camera.position;
  const [fx, fy, fz] = camera.forward;
  const vfov = camera.fov * DEG;
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const pitch = Math.asin(clamp(fy, -1, 1));
  const heading = Math.hypot(fx, fz) < 1e-3 ? 0 : Math.atan2(fz, fx);
  const viewLo = pitch - vfov * 0.4;
  const viewHi = pitch + vfov * 0.4;

  // começa por uma distância sorteada e testa as outras em sequência
  const offset = Math.floor(rand() * spec.distances.length);
  for (let n = 0; n < spec.distances.length; n++) {
    const distance = spec.distances[(offset + n) % spec.distances.length]!;
    const lowRatio = (spec.altitude[0] - cy) / distance;
    const highRatio = (spec.altitude[1] - cy) / distance;
    if (lowRatio > 1 || highRatio < -1) continue;
    const lo = Math.max(viewLo, Math.asin(clamp(lowRatio, -1, 1)));
    const hi = Math.min(viewHi, Math.asin(clamp(highRatio, -1, 1)));
    if (lo > hi) continue;

    // alguns sorteios por distância: perto das bordas, parte dos pontos cai sobre a cidade ou longe demais
    for (let attempt = 0; attempt < 4; attempt++) {
      const phi = lerp(lo, hi, rand());
      const theta = heading + (rand() * 2 - 1) * hfov * 0.3;
      const horizontal = Math.cos(phi) * distance;
      const mid: Vec3 = [cx + Math.cos(theta) * horizontal, cy + Math.sin(phi) * distance, cz + Math.sin(theta) * horizontal];
      if (Math.hypot(mid[0], mid[2]) > SKY_LIMIT || !clearsCity(kind, mid)) continue;
      // a aurora é um arco ao redor da câmera, de frente para ela
      const pivot: Vec3 | null = kind === "aurora" ? [cx, mid[1], cz] : null;
      return { mid, heading: theta, pivot };
    }
  }
  return null;
}

/** Trajeto que cruza a cidade por cima, numa direção qualquer (usado quando nada cabe na visão) */
export function worldPlacement(kind: SkyEventKind, rand: () => number): Placement {
  const spec = SKY_KINDS[kind];
  const heading = rand() * Math.PI * 2;
  const lateral = (rand() * 2 - 1) * 70;
  const y = lerp(Math.max(spec.altitude[0], spec.clearance), spec.altitude[1], rand());
  // desloca o trajeto para o lado (perpendicular à direção em que o evento vai andar)
  const mid: Vec3 = [Math.cos(heading) * lateral, y, Math.sin(heading) * lateral];
  return { mid, heading, pivot: kind === "aurora" ? [0, y, 0] : null };
}

function buildEvent(kind: SkyEventKind, placement: Placement, rand: () => number, id: number): SkyEvent {
  const spec = SKY_KINDS[kind];
  const duration = Math.round(lerp(spec.duration[0], spec.duration[1], rand()) * 100) / 100;
  const seed = Math.floor(rand() * 1e6);
  const [mx, my, mz] = placement.mid;

  if (kind === "aurora") {
    const pivot = placement.pivot ?? [0, my, 0];
    const radius = Math.max(Math.hypot(mx - pivot[0], mz - pivot[2]), 1);
    const center = Math.atan2(mz - pivot[2], mx - pivot[0]);
    const span = 45 * DEG;
    const at = (a: number): Vec3 => [pivot[0] + Math.cos(a) * radius, my, pivot[2] + Math.sin(a) * radius];
    return { id, kind, start: at(center - span), end: at(center + span), pivot, duration, seed };
  }

  // anda de lado em relação à câmera (cruza a tela), com um pouco de inclinação aleatória
  const sign = rand() < 0.5 ? -1 : 1;
  const angle = placement.heading + sign * (Math.PI / 2) + (rand() - 0.5) * 0.9;
  const half = spec.length / 2;
  const dx = Math.cos(angle) * half;
  const dz = Math.sin(angle) * half;
  const drop = spec.descent / 2;
  return {
    id,
    kind,
    start: [mx - dx, my + drop, mz - dz],
    end: [mx + dx, my - drop, mz + dz],
    pivot: null,
    duration,
    seed,
  };
}

export type PlanContext = {
  camera: CameraView;
  /** último evento sorteado: não repete o mesmo em seguida */
  previous: SkyEventKind | null;
  /** já há um evento longo no céu */
  longActive: boolean;
  id: number;
  /** força um tipo (para testes e para a ferramenta de desenvolvimento) */
  force?: SkyEventKind;
};

/** Sorteia o próximo evento e o trajeto dele; null se nada puder acontecer agora */
export function planSkyEvent(rand: () => number, ctx: PlanContext): SkyEvent | null {
  let pool = ctx.force
    ? [ctx.force]
    : SKY_EVENT_KINDS.filter((k) => k !== ctx.previous && !(ctx.longActive && SKY_KINDS[k].long));

  while (pool.length > 0) {
    const kind = pickWeighted(rand, pool);
    const placement = placeInView(kind, rand, ctx.camera);
    if (placement) return buildEvent(kind, placement, rand, ctx.id);
    pool = pool.filter((k) => k !== kind);
  }

  if (ctx.force) return buildEvent(ctx.force, worldPlacement(ctx.force, rand), rand, ctx.id);
  if (ctx.longActive) return null;
  const fallback = SKY_EVENT_KINDS.filter((k) => SKY_KINDS[k].worldFallback && k !== ctx.previous);
  if (fallback.length === 0) return null;
  const kind = pickWeighted(rand, fallback);
  return buildEvent(kind, worldPlacement(kind, rand), rand, ctx.id);
}

export type ShowerMeteor = { start: Vec3; end: Vec3; delay: number; duration: number };

/** Os meteoros de uma chuva de meteoros: trajetos quase paralelos, em momentos diferentes */
export function showerMeteors(event: SkyEvent, count = 9): ShowerMeteor[] {
  const rand = seededRandom(event.seed);
  const [sx, sy, sz] = event.start;
  const [ex, ey, ez] = event.end;
  // direção horizontal perpendicular ao trajeto, para espalhar os meteoros lado a lado
  const len = Math.hypot(ex - sx, ez - sz) || 1;
  const px = -(ez - sz) / len;
  const pz = (ex - sx) / len;
  const list: ShowerMeteor[] = [];
  for (let i = 0; i < count; i++) {
    const side = (rand() - 0.5) * 90;
    const up = (rand() - 0.5) * 50;
    const shrink = 0.6 + rand() * 0.4;
    const start: Vec3 = [sx + px * side, sy + up, sz + pz * side];
    const end: Vec3 = [
      start[0] + (ex - sx) * shrink,
      start[1] + (ey - sy) * shrink,
      start[2] + (ez - sz) * shrink,
    ];
    const duration = 1.1 + rand() * 0.6;
    list.push({ start, end, duration, delay: rand() * Math.max(event.duration - duration - 0.2, 0) });
  }
  return list;
}

export type DroneShape = "v" | "ring" | "heart";

/**
 * Posição de um drone na formação (x = para a frente, y = para cima, z = para o lado).
 * O anel e o coração ficam de pé, de frente para quem vê o trajeto de lado.
 */
export function formationShape(shape: DroneShape, i: number, n: number): Vec3 {
  if (shape === "v") {
    const k = Math.floor((i + 1) / 2);
    const side = i % 2 === 0 ? 1 : -1;
    return [-k * 2.4, 0, side * k * 2.4];
  }
  const t = (i / n) * Math.PI * 2;
  if (shape === "ring") return [Math.cos(t) * 11, Math.sin(t) * 11, 0];
  const x = 16 * Math.sin(t) ** 3;
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x * 0.75, y * 0.75, 0];
}

/** Roteiro do show de drones ao longo do trajeto: V → anel → coração → V */
const DRONE_SEQUENCE: readonly { at: number; shape: DroneShape }[] = [
  { at: 0, shape: "v" },
  { at: 0.22, shape: "v" },
  { at: 0.34, shape: "ring" },
  { at: 0.5, shape: "ring" },
  { at: 0.62, shape: "heart" },
  { at: 0.8, shape: "heart" },
  { at: 0.9, shape: "v" },
  { at: 1, shape: "v" },
];

export function droneOffset(i: number, n: number, progress: number): Vec3 {
  const p = clamp(progress, 0, 1);
  let k = 0;
  while (k < DRONE_SEQUENCE.length - 2 && p > DRONE_SEQUENCE[k + 1]!.at) k++;
  const a = DRONE_SEQUENCE[k]!;
  const b = DRONE_SEQUENCE[k + 1]!;
  const raw = b.at > a.at ? (p - a.at) / (b.at - a.at) : 1;
  const t = raw * raw * (3 - 2 * raw); // smoothstep: a troca de formação acelera e freia
  const from = formationShape(a.shape, i, n);
  const to = formationShape(b.shape, i, n);
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
}

/** Brilho de entrada e saída (0 a 1) para o evento não "pipocar" no céu */
export function fadeInOut(progress: number, edge: number): number {
  if (progress <= 0 || progress >= 1) return 0;
  return Math.min(1, progress / edge, (1 - progress) / edge);
}
