import { z } from "zod";
import { TrackIdSchema, type TrackId } from "./schemas";

/**
 * Lógica pura do progresso (sem React, sem localStorage).
 * A store em /store/progress.ts usa estas funções; os testes também.
 */

export const PROGRESS_SCHEMA_VERSION = 2;
export const EXPORT_APP_ID = "devcity";

export const resourceStatuses = ["want", "watching", "done"] as const;
export const ResourceStatusSchema = z.enum(resourceStatuses);
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>;

export const PreferencesSchema = z.object({
  /** Fases 3+: modo de navegação da cidade */
  navMode: z.enum(["travel", "free"]),
  /** "auto": 3D se houver WebGL e o sistema não pedir menos movimento; "2d"/"3d" forçam o modo */
  viewMode: z.enum(["auto", "3d", "2d"]),
  graphics: z.enum(["auto", "high", "low"]),
  rain: z.boolean(),
  sound: z.boolean(),
  /** meteoros, dirigíveis e outros eventos aleatórios no céu da cidade */
  skyEvents: z.boolean(),
  libraryLanguage: z.enum(["both", "pt-BR", "en"]),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const ProgressDataSchema = z.object({
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  /** chave `${projectId}:${stepId}` → timestamp (ms) de quando foi concluída */
  completedSteps: z.record(z.string(), z.number()),
  /** versão 2: critérios de pronto marcados, chave `${projectId}:${stepId}#${índice}` → timestamp */
  checkedCriteria: z.record(z.string(), z.number()),
  resourceStatus: z.record(z.string(), ResourceStatusSchema),
  lastProject: z.object({ track: TrackIdSchema, projectId: z.string() }).nullable(),
  /** última posição da câmera na cidade (fase 3+) */
  lastPosition: z.tuple([z.number(), z.number(), z.number()]).nullable(),
  preferences: PreferencesSchema,
});
export type ProgressData = z.infer<typeof ProgressDataSchema>;

export const defaultPreferences: Preferences = {
  navMode: "travel",
  viewMode: "auto",
  graphics: "auto",
  rain: true,
  sound: false, // trilha sonora desligada por padrão
  skyEvents: true,
  libraryLanguage: "both",
};

export function defaultProgress(): ProgressData {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    completedSteps: {},
    checkedCriteria: {},
    resourceStatus: {},
    lastProject: null,
    lastPosition: null,
    preferences: { ...defaultPreferences },
  };
}

export function stepKey(projectId: string, stepId: string): string {
  return `${projectId}:${stepId}`;
}

/** Chave de um critério de pronto: a etapa + a posição do critério na lista */
export function criterionKey(projectId: string, stepId: string, index: number): string {
  return `${stepKey(projectId, stepId)}#${index}`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Converte qualquer versão antiga (ou dado parcial/corrompido) para a versão atual.
 * Campos inválidos são descartados individualmente em vez de apagar tudo.
 * Versão 2 só acrescentou `checkedCriteria`: dados da versão 1 chegam sem ele e ganham `{}`.
 */
export function migrateProgress(raw: unknown): ProgressData {
  const base = defaultProgress();
  if (!isObject(raw)) return base;

  const completed = isObject(raw.completedSteps) ? raw.completedSteps : {};
  for (const [k, v] of Object.entries(completed)) {
    if (typeof v === "number" && Number.isFinite(v)) base.completedSteps[k] = v;
    else if (v === true) base.completedSteps[k] = 0; // formato antigo: booleano
  }

  const criteria = isObject(raw.checkedCriteria) ? raw.checkedCriteria : {};
  for (const [k, v] of Object.entries(criteria)) {
    if (typeof v === "number" && Number.isFinite(v)) base.checkedCriteria[k] = v;
  }

  const statuses = isObject(raw.resourceStatus) ? raw.resourceStatus : {};
  for (const [k, v] of Object.entries(statuses)) {
    const parsed = ResourceStatusSchema.safeParse(v);
    if (parsed.success) base.resourceStatus[k] = parsed.data;
  }

  const last = z
    .object({ track: TrackIdSchema, projectId: z.string() })
    .safeParse(raw.lastProject);
  if (last.success) base.lastProject = last.data;

  const pos = z.tuple([z.number(), z.number(), z.number()]).safeParse(raw.lastPosition);
  if (pos.success) base.lastPosition = pos.data;

  if (isObject(raw.preferences)) {
    for (const key of Object.keys(PreferencesSchema.shape) as (keyof Preferences)[]) {
      const field = PreferencesSchema.shape[key].safeParse(raw.preferences[key]);
      if (field.success) (base.preferences as Record<string, unknown>)[key] = field.data;
    }
  }

  return base;
}

// ---------- Exportar / importar ----------

export type ExportFile = {
  app: typeof EXPORT_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: ProgressData;
};

export function serializeProgress(data: ProgressData, now = new Date()): string {
  const file: ExportFile = {
    app: EXPORT_APP_ID,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

export type ImportResult =
  | { ok: true; data: ProgressData }
  | { ok: false; error: "invalid-json" | "not-devcity" | "newer-version" };

export function parseImportedProgress(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid-json" };
  }
  if (!isObject(json) || json.app !== EXPORT_APP_ID || !isObject(json.data)) {
    return { ok: false, error: "not-devcity" };
  }
  const version = typeof json.schemaVersion === "number" ? json.schemaVersion : 0;
  if (version > PROGRESS_SCHEMA_VERSION) return { ok: false, error: "newer-version" };
  return { ok: true, data: migrateProgress(json.data) };
}

// ---------- Cálculos ----------

type StepRef = { id: string };
type ProjectRef = { id: string; track: TrackId; order: number; steps: StepRef[] };

export type ProgressSummary = { done: number; total: number; ratio: number };

function summary(done: number, total: number): ProgressSummary {
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function projectProgress(
  project: ProjectRef,
  completed: ProgressData["completedSteps"],
): ProgressSummary {
  const done = project.steps.filter((s) => stepKey(project.id, s.id) in completed).length;
  return summary(done, project.steps.length);
}

export function aggregateProgress(
  projects: ProjectRef[],
  completed: ProgressData["completedSteps"],
): ProgressSummary {
  let done = 0;
  let total = 0;
  for (const p of projects) {
    const s = projectProgress(p, completed);
    done += s.done;
    total += s.total;
  }
  return summary(done, total);
}

export type NextStep = { track: TrackId; projectId: string; stepId: string; stepIndex: number };

/**
 * Próximo passo sugerido: a primeira etapa não concluída do último projeto aberto.
 * Se ele estiver completo, segue para os próximos projetos da mesma trilha;
 * sem histórico, começa pelo primeiro projeto de Fundamentos.
 */
export function findNextStep(
  projects: ProjectRef[],
  completed: ProgressData["completedSteps"],
  lastProject: ProgressData["lastProject"],
): NextStep | null {
  const track: TrackId = lastProject?.track ?? "fundamentos";
  const inTrack = projects.filter((p) => p.track === track).sort((a, b) => a.order - b.order);
  const startIdx = Math.max(
    0,
    inTrack.findIndex((p) => p.id === lastProject?.projectId),
  );
  const ordered = [...inTrack.slice(startIdx), ...inTrack.slice(0, startIdx)];

  for (const p of ordered) {
    const idx = p.steps.findIndex((s) => !(stepKey(p.id, s.id) in completed));
    if (idx !== -1) {
      return { track: p.track, projectId: p.id, stepId: p.steps[idx]!.id, stepIndex: idx };
    }
  }
  return null;
}
