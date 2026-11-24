import type { TrackId } from "./schemas";

/** Dados já traduzidos que o servidor entrega para a cidade 3D (sem textos longos de etapas) */
export type CityProjectData = {
  id: string;
  track: TrackId;
  order: number;
  title: string;
  level: number;
  href: string;
  whatYouBuild: string;
  steps: { id: string; title: string }[];
};

export type CityDistrictData = {
  id: string;
  kind: "library" | "track";
  name: string;
  tagline: string;
  color: string;
  href: string;
  meta: string;
  recommended: boolean;
  whyPoints: string[];
  projects: CityProjectData[];
  /** só na biblioteca: tecnologias com mais recursos */
  topTechnologies: { slug: string; label: string; count: number }[];
};

export type CityData = {
  hubName: string;
  hubColor: string;
  districts: CityDistrictData[];
};
