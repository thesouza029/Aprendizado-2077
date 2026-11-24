import { describe, expect, it } from "vitest";
import { seededRandom, type Vec3 } from "@/lib/city-layout";
import {
  SKY_EVENT_KINDS,
  SKY_KINDS,
  SKY_LIMIT,
  SKY_TIMING,
  clearsCity,
  droneOffset,
  fadeInOut,
  formationShape,
  nextSkyDelay,
  placeInView,
  planSkyEvent,
  showerMeteors,
  type CameraView,
  type SkyEventKind,
} from "@/lib/sky-events";

const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};

/** câmera olhando para o horizonte, um pouco para cima (céu à vista) */
const skyward: CameraView = { position: [0, 30, 120], forward: norm([0, 0.25, -1]), fov: 50, aspect: 16 / 9 };
/** visão geral: alto e olhando para baixo (nada de céu na tela) */
const overview: CameraView = { position: [0, 110, 170], forward: norm([0, -110, -160]), fov: 50, aspect: 16 / 9 };
/** olhando direto para o chão */
const ground: CameraView = { position: [0, 20, 0], forward: [0, -1, 0], fov: 50, aspect: 1 };

/** O ponto está dentro do campo de visão da câmera? */
function inView(camera: CameraView, p: Vec3): boolean {
  const d = norm([p[0] - camera.position[0], p[1] - camera.position[1], p[2] - camera.position[2]]);
  const cos = d[0] * camera.forward[0] + d[1] * camera.forward[1] + d[2] * camera.forward[2];
  const halfDiagonal = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * Math.hypot(1, camera.aspect));
  return cos > Math.cos(halfDiagonal);
}

describe("eventos no céu: quando", () => {
  it("primeiro evento logo, depois um a cada 20–45 s", () => {
    const rand = seededRandom(1);
    for (let i = 0; i < 50; i++) {
      const first = nextSkyDelay(rand, true);
      const next = nextSkyDelay(rand);
      expect(first >= SKY_TIMING.first[0] && first <= SKY_TIMING.first[1]).toBe(true);
      expect(next >= SKY_TIMING.between[0] && next <= SKY_TIMING.between[1]).toBe(true);
    }
  });

  it("fadeInOut começa e termina apagado", () => {
    expect(fadeInOut(0, 0.1)).toBe(0);
    expect(fadeInOut(1, 0.1)).toBe(0);
    expect(fadeInOut(0.5, 0.1)).toBe(1);
    expect(fadeInOut(0.05, 0.1)).toBe(0.5);
  });
});

describe("eventos no céu: onde", () => {
  it.each(SKY_EVENT_KINDS)("%s olhando para o céu: passa na frente da câmera, na altura certa", (kind) => {
    const rand = seededRandom(7);
    for (let i = 0; i < 20; i++) {
      const placed = placeInView(kind, rand, skyward);
      if (!placed) throw new Error("não coube na visão");
      const [lo, hi] = SKY_KINDS[kind].altitude;
      expect(placed.mid[1] >= lo - 0.01 && placed.mid[1] <= hi + 0.01).toBe(true);
      expect(inView(skyward, placed.mid)).toBe(true);
      expect(Math.hypot(placed.mid[0], placed.mid[2]) <= SKY_LIMIT).toBe(true);
      expect(clearsCity(kind, placed.mid)).toBe(true);
    }
  });

  it("da visão geral: meteoro e aurora nunca baixos sobre a cidade; o dirigível cabe na tela", () => {
    const rand = seededRandom(3);
    for (let i = 0; i < 50; i++) {
      for (const kind of ["meteor", "aurora"] as const) {
        const placed = placeInView(kind, rand, overview);
        if (placed) expect(clearsCity(kind, placed.mid)).toBe(true);
      }
    }
    const blimp = placeInView("blimp", rand, overview);
    if (!blimp) throw new Error("o dirigível deveria caber");
    expect(inView(overview, blimp.mid)).toBe(true);
  });

  it("da Torre Central (olhando o horizonte), meteoros aparecem baixos, além da cidade", () => {
    const hub: CameraView = { position: [0, 30, 52], forward: norm([0, -12, -52]), fov: 50, aspect: 4 / 3 };
    const rand = seededRandom(17);
    const placed = placeInView("meteor", rand, hub);
    if (!placed) throw new Error("o meteoro deveria caber no horizonte");
    expect(inView(hub, placed.mid)).toBe(true);
    expect(Math.hypot(placed.mid[0], placed.mid[2]) >= 230).toBe(true);
  });

  it("o trajeto cruza a tela de lado, com o comprimento do evento", () => {
    const rand = seededRandom(11);
    for (let id = 1; id <= 30; id++) {
      const event = planSkyEvent(rand, { camera: skyward, previous: null, longActive: false, id, force: "cargo" });
      if (!event) throw new Error("sem evento");
      const dx = event.end[0] - event.start[0];
      const dz = event.end[2] - event.start[2];
      expect(Math.abs(Math.hypot(dx, dz) - SKY_KINDS.cargo.length) < 0.01).toBe(true);
      // câmera olha para -z: andar de lado é andar mais em x do que em z
      expect(Math.abs(dx) > Math.abs(dz)).toBe(true);
    }
  });

  it("meteoros caem na diagonal", () => {
    const event = planSkyEvent(seededRandom(5), { camera: skyward, previous: null, longActive: false, id: 1, force: "meteor" });
    expect(event!.end[1] < event!.start[1]).toBe(true);
  });

  it("aurora: arco de frente para a câmera", () => {
    const event = planSkyEvent(seededRandom(9), { camera: skyward, previous: null, longActive: false, id: 1, force: "aurora" });
    if (!event?.pivot) throw new Error("aurora sem centro");
    const r1 = Math.hypot(event.start[0] - event.pivot[0], event.start[2] - event.pivot[2]);
    const r2 = Math.hypot(event.end[0] - event.pivot[0], event.end[2] - event.pivot[2]);
    expect(Math.abs(r1 - r2) < 0.01).toBe(true);
    expect(event.pivot[0]).toBe(skyward.position[0]);
  });
});

describe("eventos no céu: sorteio", () => {
  it("não repete o mesmo evento duas vezes seguidas", () => {
    const rand = seededRandom(21);
    let previous: SkyEventKind | null = null;
    for (let id = 1; id <= 200; id++) {
      const event = planSkyEvent(rand, { camera: skyward, previous, longActive: false, id });
      if (!event) throw new Error("sem evento");
      expect(event.kind === previous).toBe(false);
      previous = event.kind;
    }
  });

  it("todos os tipos aparecem com o tempo", () => {
    const rand = seededRandom(4);
    const seen = new Set<string>();
    let previous: SkyEventKind | null = null;
    for (let id = 1; id <= 300; id++) {
      const event = planSkyEvent(rand, { camera: skyward, previous, longActive: false, id });
      if (event) {
        seen.add(event.kind);
        previous = event.kind;
      }
    }
    expect(seen.size).toBe(SKY_EVENT_KINDS.length);
  });

  it("com um evento longo no céu, só sai evento curto (ou nada)", () => {
    const rand = seededRandom(8);
    for (let id = 1; id <= 100; id++) {
      const event = planSkyEvent(rand, { camera: skyward, previous: null, longActive: true, id });
      if (event) expect(SKY_KINDS[event.kind].long).toBe(false);
    }
    expect(planSkyEvent(rand, { camera: overview, previous: null, longActive: true, id: 1 })).toBeNull();
  });

  it("câmera olhando o chão: um evento longo cruza a cidade por cima", () => {
    const rand = seededRandom(2);
    for (let id = 1; id <= 30; id++) {
      const event = planSkyEvent(rand, { camera: ground, previous: null, longActive: false, id });
      if (!event) throw new Error("sem evento");
      expect(SKY_KINDS[event.kind].worldFallback).toBe(true);
      const mid = [(event.start[0] + event.end[0]) / 2, (event.start[2] + event.end[2]) / 2] as const;
      expect(Math.hypot(...mid) <= 70.01).toBe(true);
    }
  });

  it("duração dentro da faixa de cada tipo", () => {
    const rand = seededRandom(13);
    for (const kind of SKY_EVENT_KINDS) {
      const event = planSkyEvent(rand, { camera: skyward, previous: null, longActive: false, id: 1, force: kind })!;
      const [lo, hi] = SKY_KINDS[kind].duration;
      expect(event.duration >= lo && event.duration <= hi).toBe(true);
    }
  });
});

describe("chuva de meteoros e drones", () => {
  it("meteoros da chuva terminam antes do evento acabar", () => {
    const event = planSkyEvent(seededRandom(6), { camera: skyward, previous: null, longActive: false, id: 1, force: "meteorShower" })!;
    const meteors = showerMeteors(event);
    expect(meteors.length).toBe(9);
    for (const m of meteors) expect(m.delay + m.duration <= event.duration).toBe(true);
  });

  it("formações sem pontos inválidos e com drones separados", () => {
    for (const shape of ["v", "ring", "heart"] as const) {
      const points = Array.from({ length: 30 }, (_, i) => formationShape(shape, i, 30));
      expect(points.every((p) => p.every(Number.isFinite))).toBe(true);
      const keys = new Set(points.map((p) => p.map((n) => n.toFixed(2)).join(",")));
      expect(keys.size).toBe(30);
    }
  });

  it("show de drones: começa e termina em V, passa pelo anel e pelo coração", () => {
    expect(droneOffset(3, 30, 0)).toEqual(formationShape("v", 3, 30));
    expect(droneOffset(3, 30, 1)).toEqual(formationShape("v", 3, 30));
    expect(droneOffset(3, 30, 0.42)).toEqual(formationShape("ring", 3, 30));
    expect(droneOffset(3, 30, 0.7)).toEqual(formationShape("heart", 3, 30));
  });
});
