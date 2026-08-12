import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Empty State — o estado vazio da casa, com a imagem trabalhando.
 *
 * ── Por que isto é um item, e não uma `<div>` que cada tela escreve ────────
 *
 * Na origem eram quatro rotas com quatro caixas `card px-6 py-12 text-center`
 * escritas à mão, cada uma com uma frase e mais nada. Quatro caixas iguais é
 * uma caixa duplicada quatro vezes: bastava alguém melhorar uma pras outras
 * três ficarem pra trás. E o vazio é justamente a tela que ninguém volta pra
 * melhorar, porque em desenvolvimento quase nunca se vê.
 *
 * A regra de entrada do registry exige estado vazio em todo item. Faltava o
 * estado vazio **canônico**.
 *
 * ── Por que a arte entra AQUI e não no meio do conteúdo ────────────────────
 *
 * Estado vazio é o único momento em que a tela não tem o que mostrar e ainda
 * precisa dizer o que vai acontecer ali. É a superfície onde a imagem trabalha
 * em vez de enfeitar. Com conteúdo na tela, a mesma imagem viraria concorrente
 * do que a pessoa veio ver.
 *
 * O véu sobre a arte não é decoração: sem ele o texto fica legível em três das
 * cinco imagens — as que têm luz de janela — e ninguém descobre isso até um
 * cliente reclamar. Contraste garantido custa uma `<div>`.
 *
 * ── O véu estava apagando a arte que ele existe pra proteger ───────────────
 *
 * Medido na vitrine: o gradiente ia de `--card` a **20% de opacidade no topo**
 * até `--card` **opaco em 96%** da faixa. Ou seja, a arte nunca aparecia mais
 * que 20%, e nos últimos 4% já era só a cor do card. Na tela a faixa lia como
 * uma tira bege vazia — o defeito que virou o "mal posicionado" no report: não
 * era posição, era uma superfície que sumiu e deixou um vão em cima do texto.
 *
 * O véu certo é escada, não cortina: transparente onde não tem texto, opaco só
 * onde o texto pousa. `transparent → transparent 42% → --card 100%`. A arte
 * trabalha na metade de cima e a frase ganha fundo sólido na de baixo.
 *
 * ── Por que a régua é o CONTAINER e não a viewport ─────────────────────────
 *
 * Estado vazio quase nunca ocupa a página: ele mora numa coluna, num painel, na
 * segunda metade de um split. Um `px-6` cravado come 48px dos 260px de uma
 * coluna lateral — e `sm:`/`md:` não ajudam, porque eles perguntam o tamanho da
 * JANELA, que naquele momento pode ser 1440px. Aqui a peça é um `@container` e
 * o respiro, a arte e a medida do texto crescem com a caixa que a recebeu.
 *
 * ── A anatomia, e as duas coisas que ela deliberadamente NÃO faz ───────────
 *
 * `arte → eyebrow → título → corpo → ação`, e no máximo **uma** ação. Vazio com
 * três botões não é ajuda, é a interface passando pra frente a decisão que ela
 * não soube tomar.
 *
 * · **Sem tombo, sem tilt.** Aqui a imagem é fundo de uma mensagem, não objeto
 *   pra pegar na mão, e fundo torto atrapalha a leitura da frase por cima.
 * · **A imagem entra por slot.** Cada app tem o seu componente de imagem
 *   otimizada; um item que impõe `<img>` cru obriga o consumidor a abrir mão
 *   dele. Sem `art`, o vazio ainda funciona — vira a caixa de texto centrada,
 *   que é o piso honesto.
 */

// `title` é ReactNode aqui, e o `title` do DOM é string (a tooltip nativa).
// Omitir é o certo: aceitar os dois nomes no mesmo lugar faria o consumidor
// escrever um e receber o outro.
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Slot da arte. `next/image`, `<img>`, ou um `@visant/cover-art`. */
  art?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Uma frase que diz o que vai aparecer ali, não que lamenta a ausência. */
  children?: React.ReactNode;
  /** UMA ação. Ver a nota acima. */
  action?: React.ReactNode;
}

export function EmptyState({
  art,
  eyebrow,
  title,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        // `min-w-0`: sem isto a peça não sabe encolher dentro de um flex ou de
        // uma coluna de grid, e empurra o irmão do lado em vez de ceder.
        "@container min-w-0 overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card",
        className,
      )}
      {...props}
    >
      {art && (
        <div className="relative">
          {art}
          {/* Contraste garantido sobre qualquer arte, sem apagá-la. Ver a nota. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, transparent 42%, var(--card) 100%)",
            }}
          />
        </div>
      )}

      {/*
       * O bloco de texto NÃO sobe por cima da arte com margem negativa.
       * `-mt-6` fazia o eyebrow pousar exatamente na emenda: com arte curta ele
       * caía no meio do gradiente e com arte alta sobrava um vão. Agora a arte
       * termina onde termina e o texto começa com o próprio respiro, que é o
       * único jeito de a peça funcionar com arte de qualquer altura.
       */}
      <div
        className={cn(
          "relative px-5 pb-8 text-center @[22rem]:px-7 @[22rem]:pb-10",
          art ? "pt-4" : "pt-8 @[22rem]:pt-10",
        )}
      >
        {eyebrow && (
          <div className="mb-2 text-[length:var(--text-rotulo,0.6875rem)] uppercase tracking-[0.08em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        {/*
         * `text-balance` no título: em coluna estreita uma frase de cinco
         * palavras quebrava com uma órfã sozinha na segunda linha, e num bloco
         * centrado a órfã é a coisa que mais denuncia texto não desenhado.
         */}
        <p className="text-balance text-[length:var(--text-destaque,0.9375rem)] font-semibold text-foreground">
          {title}
        </p>
        {children && (
          // A medida do corpo em `cqi` e não em `max-w-sm`: 384px fixos não são
          // medida nenhuma dentro de uma coluna de 260px — ali o `max-w` nunca
          // morde e a linha vai de borda a borda.
          <div
            className="mx-auto mt-2 text-pretty text-[length:var(--text-apoio,0.75rem)] leading-relaxed text-muted-foreground"
            style={{ maxWidth: "min(24rem, 92cqi)" }}
          >
            {children}
          </div>
        )}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
