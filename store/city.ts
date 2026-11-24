"use client";

import { create } from "zustand";
import { OVERVIEW_ID, type Destination, type Vec3 } from "@/lib/city-layout";
import { useProgressStore } from "./progress";

/** Estado da navegação na cidade 3D (não é salvo: vale só enquanto a página está aberta) */
type CityState = {
  /** destino cujo painel está aberto */
  activeId: string | null;
  /** voo pedido; a câmera (CameraRig) observa este campo */
  flight: Destination | null;
  /** destino para onde a câmera está voando agora */
  flyingTo: string | null;
  /** destino sob o mouse (mostra o letreiro do prédio) */
  hoveredId: string | null;
  /** para onde a câmera orbital olha ao voltar do voo livre */
  resumeTarget: Vec3 | null;
  flyTo: (destination: Destination) => void;
  arrive: (id: string) => void;
  closePanel: () => void;
  setHovered: (id: string | null) => void;
  setResumeTarget: (target: Vec3 | null) => void;
};

export const useCityStore = create<CityState>()((set) => ({
  activeId: null,
  flight: null,
  flyingTo: null,
  hoveredId: null,
  resumeTarget: null,
  flyTo: (destination) => set({ flight: destination, flyingTo: destination.id, activeId: null }),
  // a visão geral não tem painel
  arrive: (id) => set({ activeId: id === OVERVIEW_ID ? null : id, flyingTo: null, flight: null }),
  closePanel: () => set({ activeId: null }),
  setHovered: (id) => set({ hoveredId: id }),
  setResumeTarget: (target) => set({ resumeTarget: target }),
}));

/** Viajar até um destino: sai do voo livre (se estiver nele) e voa no modo Viagem */
export function travelTo(destination: Destination) {
  const prefs = useProgressStore.getState();
  if (prefs.preferences.navMode !== "travel") prefs.setPreference("navMode", "travel");
  useCityStore.getState().flyTo(destination);
}
