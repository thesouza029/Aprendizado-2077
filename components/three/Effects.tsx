"use client";

import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { TierSettings } from "@/lib/quality";

type Props = Pick<TierSettings, "multisampling" | "bloomLevels">;

/**
 * Pós-processamento: o bloom só pega o que passa de 1.0 de brilho (luminanceThreshold),
 * ou seja, os materiais neon (emissive alto, toneMapped false). Fachadas e chão não brilham.
 * O tone mapping ACES vem depois, para o neon estourado ficar com cara de luz real.
 * Com gráficos mais leves, o bloom usa menos níveis e o antisserrilhado sai.
 */
export function Effects({ multisampling, bloomLevels }: Props) {
  return (
    <EffectComposer multisampling={multisampling}>
      <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.15} levels={bloomLevels} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
