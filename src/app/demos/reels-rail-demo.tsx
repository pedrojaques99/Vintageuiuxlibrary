"use client";

/**
 * A demo do trilho de reels mora sozinha porque ela é cara em três sentidos.
 *
 * 1. **Ela toca vídeo.** Um card de catálogo que decodifica H.264 o tempo todo é
 *    bateria queimada; aqui o pedaço só chega quando o card chega, e a
 *    reprodução ainda respeita o palco (`useStageActive`) — card fora da tela,
 *    relógio parado, além do observer que a própria peça já tem.
 * 2. **O acervo não tem vertical de verdade.** O banco de mídia da vitrine tem
 *    três vídeos, e o mais alto é 960×1200 (4:5). Num trilho 9:16 eles entram
 *    recortados pelo `object-cover` — que é exatamente o que a peça faz num
 *    projeto real com material de reels, então o teste continua honesto — mas a
 *    proporção nativa não está sendo exercitada. Os retratos entram como
 *    preenchimento pra faixa ter comprimento de trilho: um reel parado num
 *    pôster é um estado real do formato, e serve pra mostrar que o card vizinho
 *    NÃO toca.
 * 3. **Ela roda em laço.** Com `loop`, a peça repete a lista o mínimo de vezes
 *    pra dar a volta — três conjuntos nesta largura, ou seja nove `<video>` no
 *    DOM apontando pras mesmas três URLs (o navegador baixa uma vez), oito
 *    deles parados no primeiro quadro o tempo todo. O número é FIXO: nada é
 *    criado depois da medida inicial, que é o que separa laço de vazamento.
 */

import * as React from "react";

import { Media } from "../media";
import { useStageActive } from "../stage";
import { ReelsRail, type ReelItem } from "../../../registry/visant/ui/reels-rail";
import type { DemoProps } from "../catalog";

/**
 * Cinco cards, não seis, e o vídeo primeiro.
 *
 * O report pediu "menos itens, maior, mais suave". Menos itens porque o laço
 * já repete a lista pra encher a faixa; mais cards de origem só trocavam vídeo
 * por retrato parado. Maior porque o card é o produto: 280px dá um 9:16 de
 * 498px no palco, e na grade ele ainda lê como reel e não como miniatura.
 * Mais suave porque a deriva caiu pra 14px/s: a 26 a fileira passava como
 * esteira e o olho não chegava a pousar em nenhum card.
 */
const CARDS: { papel: "video" | "retrato"; indice: number; title: string; meta: string }[] = [
  { papel: "video", indice: 2, title: "Composição em movimento", meta: "0:14" },
  { papel: "retrato", indice: 1, title: "Bastidor da campanha", meta: "0:22" },
  { papel: "video", indice: 1, title: "Vinheta de abertura", meta: "0:08" },
  { papel: "video", indice: 0, title: "Loop do produto", meta: "0:11" },
  { papel: "retrato", indice: 4, title: "Direção de arte", meta: "0:31" },
];

export default function ReelsRailDemo({ props }: DemoProps) {
  const ativo = useStageActive();

  const itens = React.useMemo<ReelItem[]>(
    () =>
      CARDS.map((c, i) => ({
        id: `${c.papel}-${i}`,
        title: c.title,
        meta: c.meta,
        media: (
          // `autoPlay={false}` no `Media`: quem manda no play é o trilho, e dois
          // donos do mesmo `<video>` produzem o clássico "pausei e voltou".
          <Media papel={c.papel} indice={c.indice} autoPlay={false} className="size-full" />
        ),
      })),
    [],
  );

  return (
    // Mural encosta na borda: sem respiro lateral, a fileira promete continuar.
    <div className="flex h-full w-full items-center">
      <ReelsRail
        items={itens}
        // A barra fina do trilho aparecia dentro do ladrilho; a fileira rola
        // pelo arrasto e pela deriva, sem precisar dela. Setas idem: no mural,
        // elas eram cromo num canto disputando com o vídeo.
        className="w-full [&_[role=group]]:[scrollbar-width:none] [&_[role=group]::-webkit-scrollbar]:hidden"
        arrows={false}
        itemWidth={280}
        gap={20}
        // A deriva também obedece ao palco: card fora da tela não anda.
        drift={ativo}
        driftSpeed={14}
        autoPlay={ativo}
        {...props}
      />
    </div>
  );
}
