"use client";

/**
 * Book 3D — o item de catálogo como OBJETO.
 *
 * Capa dura com lombada curva, espessura vinda da contagem de páginas, praça
 * (a sobra do cartão além do bloco de páginas) e inclinação que segue o
 * ponteiro. A cor do objeto sai dos tokens da marca e do matiz da própria arte.
 *
 * ── Por que separado do palco ──────────────────────────────────────────────
 *
 * `three` + `fiber` + `drei` somam ~180 KB gz. Um `import` direto colaria isso
 * no bundle de QUALQUER rota que importasse este arquivo, inclusive as que só
 * mostram um card. Aqui o WebGL só desce quando o navegador chega na peça.
 *
 * `React.lazy` e não `next/dynamic` de propósito: o item roda em Vite, Remix e
 * Next igual, e `next/dynamic` só existe num deles.
 *
 * ── A LINHA DO react-three-fiber, e por que ela está fixada ────────────────
 *
 * As dependências declaram `@react-three/fiber@^8` + `@react-three/drei@^9`.
 * Não é conservadorismo: o fiber v9 exige React >= 19 e a instalação FALHA num
 * projeto React 18, com um erro de peer que não diz o que fazer. A linha 8
 * instala nos dois.
 *
 * Este código roda igual nas duas linhas — foi verificado nas duas, e não
 * deduzido: fiber 8 + drei 9 sobre React 18 nesta vitrine, e fiber 9 + drei 10
 * sobre React 19 no app de onde a peça foi colhida.
 *
 * Num projeto React 19, subir vale a pena (o v9 é a linha mantida):
 *   npm i three@latest @react-three/fiber@^9 @react-three/drei@^10
 *
 * Atenção ao contrário: instalar o fiber v9 num projeto React 18 não quebra só
 * em runtime. A augmentação de JSX dele mira `React.JSX`, que não existe nos
 * types do 18, e o namespace vazio que ela cria APAGA a tipagem de todo
 * elemento intrínseco do projeto — `<div>` passa a aceitar `never`. O sintoma
 * aparece em arquivos que não têm nada a ver com 3D.
 *
 * ── ONDE ISTO NÃO VAI ──────────────────────────────────────────────────────
 *
 * Num trilho de 20–40 cards. Quarenta contextos WebGL derrubam telefone, e o
 * navegador começa a descartar os mais antigos — o que na tela lê como "os
 * livros sumiram", sem erro nenhum. Pra prateleira longa, renderize uma vez e
 * sirva imagem; pra uma dobra de destaque com poucos itens, é aqui.
 */

import * as React from "react";

import { CoverArt } from "@/components/ui/cover-art";
import { cn } from "@/lib/utils";
import type { BookStageProps } from "@/components/ui/book-stage";

const BookStage = React.lazy(() => import("@/components/ui/book-stage"));

export interface Book3DProps extends BookStageProps {
  className?: string;
}

/**
 * O reserva é a capa 2D determinística do `cover-art`, na proporção do livro.
 *
 * Não é spinner e não é caixa cinza de propósito: enquanto o WebGL desce, e em
 * qualquer máquina onde ele não desça, a peça mostra a MESMA arte derivada da
 * mesma semente que o card do catálogo mostra. Quem olha nunca vê buraco, e
 * nunca vê duas identidades pro mesmo item.
 */
function Standby({ seed, title }: { seed: string; title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="relative aspect-[0.68] h-[76%] overflow-hidden"
        /* Raio e transição vão em `style`, e não em classe arbitrária do
           Tailwind: `rounded-[var(--r-surface,4px)]` não gera regra nenhuma —
           a vírgula do fallback quebra o parser de valor arbitrário, e o portão
           `check:css-tokens` pegou as duas classes sem estilo. Falha silenciosa
           clássica: o className existe, o CSS não. */
        style={{ borderRadius: "var(--r-surface, 4px)" }}
      >
        <CoverArt title={title} seed={seed} family="book" titleless />
      </div>
    </div>
  );
}

export function Book3D({ className, ...stage }: Book3DProps) {
  const [ready, setReady] = React.useState(false);
  const announce = React.useCallback(() => setReady(true), []);
  const { seed, title, onReady } = stage;

  const handleReady = React.useCallback(() => {
    announce();
    onReady?.();
  }, [announce, onReady]);

  return (
    <div
      className={cn("relative aspect-[4/5] w-full", className)}
      role="img"
      aria-label={title}
    >
      {/**
       * O reserva fica ATRÁS e some no primeiro quadro do livro INTEIRO — não
       * do canvas.
       *
       * Duas armadilhas foram pagas aqui. A primeira: o canvas é transparente,
       * então enquanto as duas artes existem elas somam, e o objeto sai turvo
       * com a capa 2D aparecendo em volta da silhueta 3D. A segunda: avisar no
       * `onCreated` do canvas é cedo demais — ele nasce pronto muito antes de a
       * arte descer, então o reserva saía, o livro aparecia com a capa
       * DESENHADA e só então a pintura entrava. Duas trocas visíveis pra montar
       * uma peça só.
       *
       * `visibility` junto de `opacity` porque um canvas transparente sobre um
       * elemento invisível ainda paga composição — e some do leitor de tela,
       * que já ouve o `aria-label` do pai.
       */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          opacity: ready ? 0 : 1,
          visibility: ready ? "hidden" : "visible",
          transition: "opacity var(--dur-slow, 300ms) var(--ease-out, ease-out)",
        }}
      >
        <Standby seed={seed} title={title} />
      </div>

      <div className="absolute inset-0">
        <React.Suspense fallback={null}>
          <BookStage {...stage} onReady={handleReady} />
        </React.Suspense>
      </div>
    </div>
  );
}
