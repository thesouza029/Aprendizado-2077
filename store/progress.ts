"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  PROGRESS_SCHEMA_VERSION,
  criterionKey,
  defaultProgress,
  migrateProgress,
  stepKey,
  type Preferences,
  type ProgressData,
  type ResourceStatus,
} from "@/lib/progress";
import type { TrackId } from "@/lib/schemas";

type Actions = {
  setStepDone: (projectId: string, stepId: string, done: boolean) => void;
  setCriterionChecked: (projectId: string, stepId: string, index: number, checked: boolean) => void;
  setResourceStatus: (resourceId: string, status: ResourceStatus | null) => void;
  setLastProject: (track: TrackId, projectId: string) => void;
  setLastPosition: (pos: [number, number, number]) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  replaceAll: (data: ProgressData) => void;
  reset: () => void;
};

export type ProgressStore = ProgressData & Actions;

function pickData(s: ProgressStore): ProgressData {
  return {
    schemaVersion: s.schemaVersion,
    completedSteps: s.completedSteps,
    checkedCriteria: s.checkedCriteria,
    resourceStatus: s.resourceStatus,
    lastProject: s.lastProject,
    lastPosition: s.lastPosition,
    preferences: s.preferences,
  };
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      ...defaultProgress(),

      setStepDone: (projectId, stepId, done) =>
        set((s) => {
          const key = stepKey(projectId, stepId);
          const completedSteps = { ...s.completedSteps };
          if (done) completedSteps[key] = Date.now();
          else delete completedSteps[key];
          return { completedSteps };
        }),

      setCriterionChecked: (projectId, stepId, index, checked) =>
        set((s) => {
          const key = criterionKey(projectId, stepId, index);
          const checkedCriteria = { ...s.checkedCriteria };
          if (checked) checkedCriteria[key] = Date.now();
          else delete checkedCriteria[key];
          return { checkedCriteria };
        }),

      setResourceStatus: (resourceId, status) =>
        set((s) => {
          const resourceStatus = { ...s.resourceStatus };
          if (status) resourceStatus[resourceId] = status;
          else delete resourceStatus[resourceId];
          return { resourceStatus };
        }),

      setLastProject: (track, projectId) => set({ lastProject: { track, projectId } }),

      setLastPosition: (pos) => set({ lastPosition: pos }),

      setPreference: (key, value) =>
        set((s) => ({ preferences: { ...s.preferences, [key]: value } })),

      replaceAll: (data) => set({ ...data }),

      reset: () => set({ ...defaultProgress() }),
    }),
    {
      name: "devcity-progress",
      version: PROGRESS_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: pickData,
      migrate: (persisted) => migrateProgress(persisted),
      // Mescla preferências em profundidade para que novas opções ganhem o valor padrão.
      merge: (persisted, current) => {
        const data = migrateProgress(persisted);
        return { ...current, ...data, preferences: { ...current.preferences, ...data.preferences } };
      },
    },
  ),
);

/** Snapshot só com os dados (para exportar) */
export function getProgressSnapshot(): ProgressData {
  return pickData(useProgressStore.getState());
}
