"use client";

/**
 * Só a nota de voz, no meio do palco. Tocar, arrastar a onda pra buscar e
 * soltar é a peça inteira; nada em volta pra explicar o que ela é.
 */

import { VoiceNote } from "../../../registry/visant/ui/voice-note";
import type { DemoProps } from "../catalog";

export default function VoiceNoteDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <VoiceNote duration={9} {...props} />
    </div>
  );
}
