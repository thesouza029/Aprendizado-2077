import { describe, expect, it } from "vitest";
import {
  PROGRESS_SCHEMA_VERSION,
  aggregateProgress,
  defaultProgress,
  findNextStep,
  migrateProgress,
  parseImportedProgress,
  projectProgress,
  serializeProgress,
  stepKey,
} from "@/lib/progress";

const projects = [
  { id: "a", track: "fundamentos" as const, order: 1, steps: [{ id: "s1" }, { id: "s2" }] },
  { id: "b", track: "fundamentos" as const, order: 2, steps: [{ id: "s1" }] },
  { id: "w", track: "web" as const, order: 1, steps: [{ id: "x" }, { id: "y" }] },
];

describe("cálculo de progresso", () => {
  it("conta etapas concluídas por projeto e no total", () => {
    const done = { [stepKey("a", "s1")]: 1, [stepKey("w", "x")]: 2 };
    expect(projectProgress(projects[0]!, done)).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(aggregateProgress(projects, done)).toEqual({ done: 2, total: 5, ratio: 0.4 });
  });

  it("projeto sem etapas não divide por zero", () => {
    expect(projectProgress({ id: "z", track: "ia", order: 1, steps: [] }, {}).ratio).toBe(0);
  });
});

describe("próximo passo", () => {
  it("sem histórico, começa em Fundamentos", () => {
    expect(findNextStep(projects, {}, null)).toEqual({
      track: "fundamentos",
      projectId: "a",
      stepId: "s1",
      stepIndex: 0,
    });
  });

  it("segue a última trilha aberta e pula etapas concluídas", () => {
    const done = { [stepKey("w", "x")]: 1 };
    expect(findNextStep(projects, done, { track: "web", projectId: "w" })?.stepId).toBe("y");
  });

  it("projeto completo passa para o próximo da trilha", () => {
    const done = { [stepKey("a", "s1")]: 1, [stepKey("a", "s2")]: 1 };
    expect(findNextStep(projects, done, { track: "fundamentos", projectId: "a" })?.projectId).toBe(
      "b",
    );
  });

  it("trilha toda concluída retorna null", () => {
    const done = { [stepKey("w", "x")]: 1, [stepKey("w", "y")]: 1 };
    expect(findNextStep(projects, done, { track: "web", projectId: "w" })).toBeNull();
  });
});

describe("migração", () => {
  it("dado inválido vira o padrão", () => {
    expect(migrateProgress("lixo")).toEqual(defaultProgress());
    expect(migrateProgress(null)).toEqual(defaultProgress());
  });

  it("aproveita campos válidos e descarta os inválidos", () => {
    const migrated = migrateProgress({
      completedSteps: { "a:s1": 123, "a:s2": true, "a:s3": "x" },
      resourceStatus: { mdn: "done", ruim: "talvez" },
      lastProject: { track: "inexistente", projectId: "a" },
      preferences: { sound: true, graphics: "ultra" },
    });
    expect(migrated.completedSteps).toEqual({ "a:s1": 123, "a:s2": 0 });
    expect(migrated.resourceStatus).toEqual({ mdn: "done" });
    expect(migrated.lastProject).toBeNull();
    expect(migrated.preferences.sound).toBe(true);
    expect(migrated.preferences.graphics).toBe("auto");
    expect(migrated.schemaVersion).toBe(PROGRESS_SCHEMA_VERSION);
  });

  it("versão 1 (sem critérios marcados) ganha a lista vazia; critérios válidos são mantidos", () => {
    const v1 = migrateProgress({ schemaVersion: 1, completedSteps: { "a:s1": 5 } });
    expect(v1.checkedCriteria).toEqual({});
    expect(v1.completedSteps).toEqual({ "a:s1": 5 });
    const v2 = migrateProgress({ checkedCriteria: { "a:s1#0": 10, "a:s1#1": "sim" } });
    expect(v2.checkedCriteria).toEqual({ "a:s1#0": 10 });
  });
});

describe("exportar e importar", () => {
  it("ida e volta preserva os dados", () => {
    const data = defaultProgress();
    data.completedSteps[stepKey("a", "s1")] = 1700000000000;
    data.resourceStatus["mdn"] = "watching";
    data.lastProject = { track: "web", projectId: "w" };
    const result = parseImportedProgress(serializeProgress(data));
    expect(result).toEqual({ ok: true, data });
  });

  it("recusa JSON inválido, de outro app ou de versão mais nova", () => {
    expect(parseImportedProgress("{")).toEqual({ ok: false, error: "invalid-json" });
    expect(parseImportedProgress('{"app":"outro","data":{}}')).toEqual({
      ok: false,
      error: "not-devcity",
    });
    expect(
      parseImportedProgress(JSON.stringify({ app: "devcity", schemaVersion: 999, data: {} })),
    ).toEqual({ ok: false, error: "newer-version" });
  });
});
