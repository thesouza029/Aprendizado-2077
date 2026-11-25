import { beforeEach, describe, expect, it } from "vitest";
import type { Destination } from "@/lib/city-layout";
import { OVERVIEW_ID } from "@/lib/city-layout";
import { PROGRESS_SCHEMA_VERSION, criterionKey, defaultProgress } from "@/lib/progress";

/** Storage em memória: os testes rodam no Node, sem navegador */
class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
}

const globals = globalThis as unknown as Record<string, unknown>;
globals.localStorage = new MemoryStorage();
globals.sessionStorage = new MemoryStorage();
globals.window = globalThis;

// as stores leem o storage ao serem criadas, então só importamos depois de prepará-lo
const { useProgressStore, getProgressSnapshot } = await import("@/store/progress");
const { usePerformanceStore } = await import("@/store/performance");
const { useCityStore, travelTo } = await import("@/store/city");

const saved = () =>
  JSON.parse(localStorage.getItem("devcity-progress") ?? "null") as { state: Record<string, unknown>; version: number };

beforeEach(() => {
  useProgressStore.getState().reset();
  usePerformanceStore.getState().clearFallback();
  useCityStore.setState({ activeId: null, flight: null, flyingTo: null, hoveredId: null, resumeTarget: null });
});

describe("store de progresso", () => {
  it("marca e desmarca etapas", () => {
    const { setStepDone } = useProgressStore.getState();
    setStepDone("diario-01-terminal", "o-que-e-programar", true);
    expect("diario-01-terminal:o-que-e-programar" in useProgressStore.getState().completedSteps).toBe(true);
    setStepDone("diario-01-terminal", "o-que-e-programar", false);
    expect("diario-01-terminal:o-que-e-programar" in useProgressStore.getState().completedSteps).toBe(false);
  });

  it("marca e desmarca critérios de pronto, um por um", () => {
    const { setCriterionChecked } = useProgressStore.getState();
    setCriterionChecked("git-02-commits", "add-e-commit", 0, true);
    setCriterionChecked("git-02-commits", "add-e-commit", 2, true);
    const checked = useProgressStore.getState().checkedCriteria;
    expect(criterionKey("git-02-commits", "add-e-commit", 0) in checked).toBe(true);
    expect(criterionKey("git-02-commits", "add-e-commit", 1) in checked).toBe(false);
    setCriterionChecked("git-02-commits", "add-e-commit", 0, false);
    expect(criterionKey("git-02-commits", "add-e-commit", 0) in useProgressStore.getState().checkedCriteria).toBe(false);
    // marcar critérios não conclui a etapa sozinho
    expect("git-02-commits:add-e-commit" in useProgressStore.getState().completedSteps).toBe(false);
  });

  it("guarda e remove o status de um recurso", () => {
    const { setResourceStatus } = useProgressStore.getState();
    setResourceStatus("pro-git-pt", "watching");
    expect(useProgressStore.getState().resourceStatus["pro-git-pt"]).toBe("watching");
    setResourceStatus("pro-git-pt", null);
    expect(useProgressStore.getState().resourceStatus["pro-git-pt"] === undefined).toBe(true);
  });

  it("muda uma preferência sem mexer nas outras", () => {
    useProgressStore.getState().setPreference("rain", false);
    const prefs = useProgressStore.getState().preferences;
    expect(prefs.rain).toBe(false);
    expect(prefs.skyEvents).toBe(defaultProgress().preferences.skyEvents);
    expect(prefs.viewMode).toBe(defaultProgress().preferences.viewMode);
  });

  it("salva no localStorage só os dados, com versão", () => {
    useProgressStore.getState().setStepDone("chat-go", "go-setup", true);
    const file = saved();
    expect(file.version).toBe(PROGRESS_SCHEMA_VERSION);
    expect(Object.keys(file.state).sort()).toEqual(Object.keys(defaultProgress()).sort());
    expect("chat-go:go-setup" in (file.state.completedSteps as Record<string, number>)).toBe(true);
  });

  it("substitui tudo (importação) e apaga tudo (reset)", () => {
    const data = { ...defaultProgress(), completedSteps: { "rag-pdfs:entender": 1 } };
    useProgressStore.getState().replaceAll(data);
    expect(getProgressSnapshot().completedSteps).toEqual({ "rag-pdfs:entender": 1 });
    useProgressStore.getState().reset();
    expect(getProgressSnapshot()).toEqual(defaultProgress());
  });

  it("o snapshot para exportar não leva funções", () => {
    const snapshot = getProgressSnapshot();
    expect(Object.values(snapshot).some((v) => typeof v === "function")).toBe(false);
  });
});

describe("store de desempenho", () => {
  it("a troca automática para o 2D vale para a sessão", () => {
    usePerformanceStore.getState().activateFallback();
    expect(usePerformanceStore.getState().fallback2d).toBe(true);
    expect(sessionStorage.getItem("devcity-perf-fallback")).toBe("1");
    usePerformanceStore.getState().clearFallback();
    expect(usePerformanceStore.getState().fallback2d).toBe(false);
    expect(sessionStorage.getItem("devcity-perf-fallback")).toBeNull();
  });

  it("ativar a troca limpa o aviso de lentidão", () => {
    usePerformanceStore.getState().setStruggling(true);
    usePerformanceStore.getState().activateFallback();
    expect(usePerformanceStore.getState().struggling).toBe(false);
  });
});

describe("store da cidade", () => {
  const web: Destination = { id: "district:web", position: [0, 30, 40], target: [0, 12, 0] };

  it("voar fecha o painel aberto e chegar abre o painel do destino", () => {
    useCityStore.setState({ activeId: "hub" });
    useCityStore.getState().flyTo(web);
    expect(useCityStore.getState().activeId).toBeNull();
    expect(useCityStore.getState().flyingTo).toBe("district:web");
    useCityStore.getState().arrive("district:web");
    expect(useCityStore.getState().activeId).toBe("district:web");
    expect(useCityStore.getState().flight).toBeNull();
  });

  it("a visão geral não abre painel", () => {
    useCityStore.getState().arrive(OVERVIEW_ID);
    expect(useCityStore.getState().activeId).toBeNull();
  });

  it("viajar a partir do voo livre volta para o modo Viagem", () => {
    useProgressStore.getState().setPreference("navMode", "free");
    travelTo(web);
    expect(useProgressStore.getState().preferences.navMode).toBe("travel");
    expect(useCityStore.getState().flyingTo).toBe("district:web");
  });
});
