/**
 * O estado vazio onde ele mora: dentro de um painel que ainda não tem nada.
 *
 * Um painel só, com o cabeçalho que ele teria cheio (nome e contagem), e o vazio
 * pousado direto nele, sem caixa (`framed={false}`): caixa dentro de painel é
 * o bloco-dentro-de-bloco que denuncia template. A arte é o selo gerado da
 * semente `favoritos-vazio` (a família dos arcos), pequeno, na cor da marca;
 * os knobs da ficha mexem nele.
 * Uma frase do que vai aparecer ali e uma ação, a quieta.
 */

import { Bookmark } from "lucide-react";

import { Chip } from "../../../registry/visant/ui/chip";
import { EmptyState, EmptyArt } from "../../../registry/visant/ui/empty-state";
import type { DemoProps } from "../catalog";

export default function EmptyStateDemo({ props }: DemoProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <section className="flex w-[360px] max-w-full flex-col rounded-[var(--r-surface,0.875rem)] border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Bookmark className="size-4 text-muted-foreground" aria-hidden="true" />
            Favoritos
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">0</span>
        </header>

        <EmptyState
          framed={false}
          className="px-2 py-6"
          title="Nada salvo ainda."
          art={
            <EmptyArt
              seed="favoritos-vazio"
              className="size-[72px] rounded-full border border-border"
              {...props}
            />
          }
          action={<Chip size="sm">Explorar o acervo</Chip>}
        >
          Marque um vídeo e ele aparece aqui, já no minuto em que você parou.
        </EmptyState>
      </section>
    </div>
  );
}
