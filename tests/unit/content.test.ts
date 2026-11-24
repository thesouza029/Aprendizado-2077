import { describe, expect, it } from "vitest";
import {
  buildContent,
  getProjects,
  getResources,
  getTracks,
} from "@/lib/content";
import { trackIds } from "@/lib/schemas";
import pt from "@/messages/pt.json";
import en from "@/messages/en.json";

function flatKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("conteúdo", () => {
  it("carrega todas as trilhas da seção 6.2", () => {
    expect(getTracks().map((t) => t.id)).toEqual([...trackIds]);
  });

  it("só tem recursos gratuitos com https", () => {
    for (const r of getResources()) {
      expect(r.free).toBe(true);
      expect(r.url.startsWith("https://")).toBe(true);
    }
  });

  it("cada projeto tem etapas de 30 min a 3 h", () => {
    for (const p of getProjects()) {
      expect(p.steps.length).toBeGreaterThan(0);
      for (const s of p.steps) {
        expect(s.estimatedMinutes >= 30 && s.estimatedMinutes <= 180).toBe(true);
      }
    }
  });

  it("rejeita referência a recurso inexistente", () => {
    const project = {
      ...getProjects()[0],
      steps: [{ ...getProjects()[0]!.steps[0], resources: ["nao-existe"] }],
    };
    expect(() => buildContent(getTracks(), getResources(), [project])).toThrow();
  });
});

describe("metas de conteúdo", () => {
  // Tecnologias principais: cada uma precisa de pelo menos 8 recursos na biblioteca
  const mainTechnologies = [
    "html", "css", "javascript", "typescript", "react", "node", "git", "sql",
    "http", "python", "linux", "terminal", "react-native", "ia", "docker", "postgresql",
  ];

  it.each(mainTechnologies)("%s tem pelo menos 8 recursos", (tech) => {
    const count = getResources().filter((r) => r.technologies.includes(tech)).length;
    expect(count >= 8).toBe(true);
  });

  it("biblioteca mistura PT-BR e inglês", () => {
    const pt = getResources().filter((r) => r.language === "pt-BR").length;
    const en = getResources().filter((r) => r.language === "en").length;
    expect(pt >= 20 && en >= 20).toBe(true);
  });

  it("cobre todos os projetos da seção 6.2 (bônus incluídos)", () => {
    const expected = { fundamentos: 4, web: 5, backend: 7, mobile: 4, devops: 6, ia: 4 };
    for (const t of getTracks()) expect(getProjects(t.id).length).toBe(expected[t.id]);
  });

  it("projetos bônus ficam no fim de cada trilha", () => {
    for (const t of getTracks()) {
      const projects = getProjects(t.id);
      const firstBonus = projects.findIndex((p) => p.bonus);
      if (firstBonus >= 0) expect(projects.slice(firstBonus).every((p) => p.bonus)).toBe(true);
    }
  });

  it("toda etapa aponta para pelo menos um recurso da biblioteca", () => {
    for (const p of getProjects()) for (const s of p.steps) expect(s.resources.length).toBeGreaterThan(0);
  });

  it("todo projeto tem etapas de Git/README e de publicação", () => {
    for (const p of getProjects()) {
      const text = JSON.stringify(p.steps).toLowerCase();
      expect(text.includes("readme")).toBe(true);
      expect(text.includes("commit") || text.includes("push")).toBe(true);
    }
  });

  it("ordem dos projetos é única dentro de cada trilha", () => {
    for (const t of getTracks()) {
      const orders = getProjects(t.id).map((p) => p.order);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });
});

describe("traduções da UI", () => {
  it("pt.json e en.json têm as mesmas chaves", () => {
    expect(flatKeys(en).sort()).toEqual(flatKeys(pt).sort());
  });
});
