"use client";

import { AdditiveBlending, CanvasTexture, DoubleSide, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace } from "three";

/** Casco escuro e metálico de naves e dirigíveis (transparente só para poder sumir aos poucos) */
export function hullMaterial(color = "#1b2036"): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.5, transparent: true });
}

/** Luz sem iluminação, com brilho acima de 1 para o bloom pegar */
export function lightMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false });
}

/** Holograma/feixe: aditivo, translúcido e visível dos dois lados */
export function glowMaterial(color: string, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    fog: false,
  });
}

/** Fonte monoespaçada do site (JetBrains Mono, carregada pelo next/font), com reserva genérica */
function monoFont(): string {
  const family = getComputedStyle(document.body).getPropertyValue("--font-jetbrains").trim();
  return family ? `${family}, monospace` : "monospace";
}

/** Painel holográfico com texto neon desenhado num canvas (nenhuma imagem para baixar) */
export function hologramTexture(message: string, color: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  ctx.fillStyle = "rgba(40, 8, 60, 0.35)";
  ctx.fillRect(0, 0, w, h);
  // linhas de varredura, como numa tela antiga
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.font = `bold 88px ${monoFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(message, w / 2, h / 2 + 4, w - 90);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
