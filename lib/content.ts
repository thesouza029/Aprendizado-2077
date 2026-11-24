import { z } from "zod";
import {
  ProjectSchema,
  ResourceSchema,
  TrackSchema,
  type Project,
  type Resource,
  type Track,
  type TrackId,
} from "./schemas";

import tracksJson from "@/content/tracks/tracks.json";
import resourcesGeral from "@/content/resources/geral.json";
import resourcesFundamentos from "@/content/resources/fundamentos.json";
import resourcesWeb from "@/content/resources/web.json";
import resourcesBackend from "@/content/resources/backend.json";
import resourcesMobile from "@/content/resources/mobile.json";
import resourcesDevops from "@/content/resources/devops.json";
import resourcesIa from "@/content/resources/ia.json";

import fundamentosPerfilDev from "@/content/tracks/fundamentos/perfil-dev.json";
import fundamentosCalculadora from "@/content/tracks/fundamentos/calculadora-jogo-da-velha.json";
import fundamentosSql from "@/content/tracks/fundamentos/banco-biblioteca-sql.json";
import fundamentosCli from "@/content/tracks/fundamentos/cli-api-http.json";
import webLanding from "@/content/tracks/web/landing-page.json";
import webTarefas from "@/content/tracks/web/app-tarefas-react.json";
import webBlog from "@/content/tracks/web/blog-nextjs-mdx.json";
import webSaas from "@/content/tracks/web/mini-saas.json";
import webVueAngular from "@/content/tracks/web/tarefas-vue-angular.json";
import backendApiNode from "@/content/tracks/backend/api-biblioteca-node.json";
import backendFastapi from "@/content/tracks/backend/encurtador-fastapi.json";
import backendSpring from "@/content/tracks/backend/estoque-spring.json";
import backendAspnet from "@/content/tracks/backend/agendamentos-aspnet.json";
import backendLaravel from "@/content/tracks/backend/ecommerce-laravel.json";
import backendGo from "@/content/tracks/backend/chat-go.json";
import backendDjango from "@/content/tracks/backend/admin-django.json";
import mobileListaCompras from "@/content/tracks/mobile/lista-compras-expo.json";
import mobileFlutter from "@/content/tracks/mobile/clima-flutter.json";
import mobileKotlin from "@/content/tracks/mobile/habitos-kotlin.json";
import mobileConectado from "@/content/tracks/mobile/app-conectado-api.json";
import devopsLinux from "@/content/tracks/devops/linux-terminal.json";
import devopsDocker from "@/content/tracks/devops/docker-compose-api.json";
import devopsCi from "@/content/tracks/devops/ci-github-actions.json";
import devopsNuvem from "@/content/tracks/devops/deploy-nuvem.json";
import devopsObservabilidade from "@/content/tracks/devops/observabilidade.json";
import devopsKubernetes from "@/content/tracks/devops/kubernetes-terraform.json";
import iaChatbot from "@/content/tracks/ia/chatbot-streaming.json";
import iaRag from "@/content/tracks/ia/rag-pdfs.json";
import iaAgente from "@/content/tracks/ia/agente-ferramentas.json";
import iaBoasPraticas from "@/content/tracks/ia/ia-boas-praticas.json";

/**
 * Para cadastrar conteúdo novo:
 * 1. crie o JSON em /content/resources ou /content/tracks/<trilha>/
 * 2. importe aqui e adicione na lista correspondente
 * O build falha se algo estiver fora do schema ou apontar para um id inexistente.
 */
const rawResources: unknown[] = [
  ...resourcesGeral,
  ...resourcesFundamentos,
  ...resourcesWeb,
  ...resourcesBackend,
  ...resourcesMobile,
  ...resourcesDevops,
  ...resourcesIa,
];
const rawProjects: unknown[] = [
  fundamentosPerfilDev,
  fundamentosCalculadora,
  fundamentosSql,
  fundamentosCli,
  webLanding,
  webTarefas,
  webBlog,
  webSaas,
  webVueAngular,
  backendApiNode,
  backendFastapi,
  backendSpring,
  backendAspnet,
  backendLaravel,
  backendGo,
  backendDjango,
  mobileListaCompras,
  mobileFlutter,
  mobileKotlin,
  mobileConectado,
  devopsLinux,
  devopsDocker,
  devopsCi,
  devopsNuvem,
  devopsObservabilidade,
  devopsKubernetes,
  iaChatbot,
  iaRag,
  iaAgente,
  iaBoasPraticas,
];

export type ContentBundle = { tracks: Track[]; resources: Resource[]; projects: Project[] };

/** Valida schema + referências cruzadas. Lança um erro listando todos os problemas. */
export function buildContent(
  rawTracks: unknown,
  rawRes: unknown[],
  rawProj: unknown[],
): ContentBundle {
  const tracks = z.array(TrackSchema).parse(rawTracks);
  const resources = z.array(ResourceSchema).parse(rawRes);
  const projects = z.array(ProjectSchema).parse(rawProj);

  const errors: string[] = [];
  const dup = (ids: string[], label: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`${label} duplicado: ${id}`);
      seen.add(id);
    }
  };
  dup(
    tracks.map((t) => t.id),
    "track",
  );
  dup(
    resources.map((r) => r.id),
    "recurso",
  );
  dup(
    projects.map((p) => p.id),
    "projeto",
  );

  const resourceIds = new Set(resources.map((r) => r.id));
  const projectIds = new Set(projects.map((p) => p.id));
  for (const p of projects) {
    dup(
      p.steps.map((s) => s.id),
      `etapa em ${p.id}`,
    );
    for (const pre of p.prerequisites) {
      if (!projectIds.has(pre)) errors.push(`${p.id}: pré-requisito inexistente "${pre}"`);
    }
    for (const s of p.steps) {
      for (const r of s.resources) {
        if (!resourceIds.has(r)) errors.push(`${p.id}/${s.id}: recurso inexistente "${r}"`);
      }
    }
  }
  if (errors.length) throw new Error(`Conteúdo inválido:\n- ${errors.join("\n- ")}`);

  tracks.sort((a, b) => a.order - b.order);
  projects.sort((a, b) =>
    a.track === b.track ? a.order - b.order : trackOrder(tracks, a.track) - trackOrder(tracks, b.track),
  );
  return { tracks, resources, projects };
}

function trackOrder(tracks: Track[], id: TrackId): number {
  return tracks.find((t) => t.id === id)?.order ?? 99;
}

const content = buildContent(tracksJson, rawResources, rawProjects);

export const LIBRARY_COLOR = "#c084fc";
export const HUB_COLOR = "#67e8f9";

export function getTracks(): Track[] {
  return content.tracks;
}

export function getTrack(id: string): Track | undefined {
  return content.tracks.find((t) => t.id === id);
}

export function getResources(): Resource[] {
  return content.resources;
}

export function getResourcesByIds(ids: string[]): Resource[] {
  return ids
    .map((id) => content.resources.find((r) => r.id === id))
    .filter((r): r is Resource => Boolean(r));
}

export function getProjects(track?: TrackId): Project[] {
  return track ? content.projects.filter((p) => p.track === track) : content.projects;
}

export function getProject(track: string, id: string): Project | undefined {
  return content.projects.find((p) => p.track === track && p.id === id);
}

/** Versão enxuta para componentes do cliente (progresso), sem textos longos */
export type ProjectSummary = {
  id: string;
  track: TrackId;
  order: number;
  steps: { id: string }[];
};

export function getProjectSummaries(): ProjectSummary[] {
  return content.projects.map((p) => ({
    id: p.id,
    track: p.track,
    order: p.order,
    steps: p.steps.map((s) => ({ id: s.id })),
  }));
}
