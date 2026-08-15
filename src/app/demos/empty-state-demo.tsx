/**
 * O estado vazio, duas vezes, com a arte saindo do código.
 *
 * ── Por que a demo saiu do `catalog.tsx` ───────────────────────────────────
 *
 * Ela era um `EmptyState` inline com uma foto do acervo em 120px de altura: uma
 * tira de imagem que a cortina de contraste comia quase inteira, e nada que
 * dissesse de onde a arte vem. O report pediu duas coisas — mais espaço pra
 * imagem e imagem generativa — e as duas mudam a cena, não a peça.
 *
 * ── Por que são DUAS caixas e não uma ──────────────────────────────────────
 *
 * "Generativo" é uma afirmação sobre variação: uma caixa sozinha prova que a
 * arte existe, não que ela nasce da semente. Lado a lado, `favoritos` e
 * `arquivados` puxam composições diferentes da mesma marca — é a única forma de
 * mostrar num quadro parado o que o `seed` faz, e sem uma linha de texto
 * explicando. As duas usam o MESMO `var(--brand)`, então trocar a marca na
 * barra da vitrine repinta as duas juntas.
 *
 * Nenhuma ação nos dois cards: com botão, a comparação viraria sobre o botão.
 * A ação é opcional na peça e está documentada lá — aqui ela atrapalharia.
 */

import { EmptyState, EmptyArt } from "../../../registry/visant/ui/empty-state";

const VAZIOS = [
  {
    seed: "favoritos",
    eyebrow: "Favoritos",
    title: "Nada salvo por aqui ainda.",
    body: "O que você salvar aparece aqui, com o trecho e o minuto do vídeo.",
  },
  {
    seed: "arquivados",
    eyebrow: "Arquivo",
    title: "O arquivo está limpo.",
    body: "Projetos encerrados vêm parar aqui, com a data em que saíram do quadro.",
  },
];

export default function EmptyStateDemo() {
  return (
    <div className="grid h-full w-full grid-cols-1 items-start gap-5 px-4 py-2 sm:grid-cols-2">
      {VAZIOS.map((v) => (
        <EmptyState
          key={v.seed}
          // `min-w-0` na coluna: sem ele a caixa não cede dentro do grid e
          // empurra a irmã pra fora do palco — o mesmo furo que o portão de
          // 360px pega.
          className="min-w-0"
          eyebrow={v.eyebrow}
          title={v.title}
          /* 200px contra os 120px de antes: a arte precisa de altura pra a
             composição aparecer inteira, e a cortina de contraste da peça só
             morde os últimos 42%. */
          art={<EmptyArt seed={v.seed} className="h-[200px] w-full" />}
        >
          {v.body}
        </EmptyState>
      ))}
    </div>
  );
}
