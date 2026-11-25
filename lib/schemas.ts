import { z } from "zod";

/**
 * Schemas do conteúdo versionado em /content.
 * Todo JSON é validado ao carregar: um erro de digitação quebra o build com mensagem clara,
 * em vez de virar um bug silencioso na tela.
 */

export const trackIds = ["fundamentos", "git", "web", "backend", "mobile", "devops", "ia"] as const;
export const TrackIdSchema = z.enum(trackIds);
export type TrackId = z.infer<typeof TrackIdSchema>;

/**
 * Texto nos dois idiomas. O português é obrigatório; o inglês pode faltar enquanto
 * a tradução não fica pronta (a tela mostra o português com um aviso).
 */
export const LocalizedSchema = z.object({
  pt: z.string().min(1),
  en: z.string().min(1).optional(),
});
export type Localized = z.infer<typeof LocalizedSchema>;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, "use kebab-case (letras minúsculas, números e hífens)");

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), "a URL precisa usar https://");

// ---------- Biblioteca ----------

export const resourceTypes = ["book", "video", "course", "docs", "article", "interactive"] as const;
export const resourceLevels = ["iniciante", "intermediario", "avancado"] as const;
export const resourceLanguages = ["pt-BR", "en"] as const;

export const ResourceSchema = z.object({
  id: slug,
  title: z.string().min(1),
  type: z.enum(resourceTypes),
  url: httpsUrl,
  author: z.string().min(1),
  language: z.enum(resourceLanguages),
  level: z.enum(resourceLevels),
  technologies: z.array(slug).min(1),
  free: z.literal(true),
  durationMinutes: z.number().int().positive().optional(),
  description: LocalizedSchema,
  /** false = link ainda precisa ser conferido por uma pessoa antes de ir para produção */
  verified: z.boolean(),
});
export type Resource = z.infer<typeof ResourceSchema>;
export type ResourceType = Resource["type"];
export type ResourceLevel = Resource["level"];
export type ResourceLanguage = Resource["language"];

// ---------- Trilhas ----------

/** Um conceito explicado como em sala de aula: o termo e o que ele significa */
export const ConceptSchema = z.object({
  term: LocalizedSchema,
  explanation: LocalizedSchema,
});

/** Um erro comum de quem está começando e como sair dele */
export const CommonErrorSchema = z.object({
  problem: LocalizedSchema,
  solution: LocalizedSchema,
});

export const StepSchema = z.object({
  id: slug,
  title: LocalizedSchema,
  /** O que deve estar funcionando no fim da etapa */
  goal: LocalizedSchema,
  /** Conceitos novos desta etapa, explicados antes do passo a passo */
  concepts: z.array(ConceptSchema).optional(),
  /**
   * Markdown: o passo a passo, explicado como um professor faria. Pode mostrar comandos
   * e exemplos pequenos de código (explicados linha a linha); o projeto em si a pessoa digita.
   */
  instructions: LocalizedSchema,
  estimatedMinutes: z.number().int().min(30).max(180), // etapas de 30 min a 3 h
  resources: z.array(slug),
  /** ids de recursos do tipo vídeo, mostrados à parte como "vídeos recomendados" */
  videos: z.array(slug).optional(),
  /** Critérios de pronto (viram caixinhas marcáveis na tela) */
  checklist: z.array(LocalizedSchema).min(1),
  commonErrors: z.array(CommonErrorSchema).optional(),
  hint: LocalizedSchema.optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const ProjectSchema = z.object({
  id: slug,
  track: TrackIdSchema,
  /** Posição na trilha (1 = primeiro) */
  order: z.number().int().positive(),
  title: LocalizedSchema,
  /** a funcionalidade que esta parte acrescenta ao projeto do distrito (uma frase) */
  feature: LocalizedSchema.optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  bonus: z.boolean().optional(),
  stack: z.array(z.string().min(1)).min(1),
  whatYouBuild: LocalizedSchema,
  whatYouLearn: z.array(LocalizedSchema).min(1),
  /** ids de outros projetos */
  prerequisites: z.array(slug),
  steps: z.array(StepSchema).min(1),
  extraChallenges: z.array(LocalizedSchema),
  portfolioTip: LocalizedSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

export const TrackSchema = z.object({
  id: TrackIdSchema,
  order: z.number().int().positive(),
  name: LocalizedSchema,
  tagline: LocalizedSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  recommendedFirst: z.boolean().optional(),
  /** o projeto único que cresce ao longo do distrito (cada prédio acrescenta uma parte) */
  project: z
    .object({
      name: LocalizedSchema,
      summary: LocalizedSchema,
    })
    .optional(),
  whyLearn: z.object({
    points: z.array(LocalizedSchema).min(1),
    jobs: z.array(LocalizedSchema).min(1),
    sources: z.array(z.object({ label: z.string().min(1), url: httpsUrl })),
  }),
});
export type Track = z.infer<typeof TrackSchema>;

/** Escolhe o texto do idioma atual (sem tradução em inglês, usa o português) */
export function tr(value: Localized, locale: string): string {
  return locale === "en" ? (value.en ?? value.pt) : value.pt;
}

/** true se o texto existe no idioma pedido (sem cair no português) */
export function isTranslated(value: Localized, locale: string): boolean {
  return locale !== "en" || value.en !== undefined;
}
