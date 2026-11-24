"use client";

/**
 * Objetos mutáveis compartilhados entre a cena 3D (dentro do <Canvas>) e a interface 2D.
 * Mudam a cada quadro (60x por segundo), por isso não passam pelo React/zustand:
 * quem lê (minimapa, letreiros) atualiza o DOM direto, sem re-renderizar componentes.
 */

/** Comandos de movimento vindos do joystick e dos botões de toque (−1 a 1) */
export const flightInput = {
  forward: 0,
  right: 0,
  up: 0,
  /** deslocamento acumulado do arrastar para olhar (px), zerado a cada quadro */
  lookX: 0,
  lookY: 0,
};

/** Posição e direção atuais da câmera no plano XZ (usadas pelo minimapa) */
export const cameraPose = { x: 0, z: 0, dirX: 0, dirZ: -1 };

/** Elementos DOM dos letreiros, posicionados a cada quadro pelo LabelProjector */
export const labelElements = new Map<string, HTMLElement>();

export function registerLabel(id: string, el: HTMLElement | null) {
  if (el) labelElements.set(id, el);
  else labelElements.delete(id);
}

/** Teclas sendo digitadas num campo, ou um diálogo aberto: atalhos da cidade ficam quietos */
export function isTypingContext(): boolean {
  const el = document.activeElement;
  if (document.querySelector("dialog[open]")) return true;
  if (!el || el === document.body) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    tag === "A" ||
    (el as HTMLElement).isContentEditable
  );
}
