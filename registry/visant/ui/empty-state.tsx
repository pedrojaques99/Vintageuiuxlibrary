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
 *
 * ── E por que a arte padrão passou a ser DESENHADA, não fotografada ────────
 *
 * Foto num estado vazio é a decisão que envelhece pior: ela vem de um acervo
 * que a marca do cliente não escolheu, custa bytes numa tela que existe pra
 * dizer "ainda não tem nada", e some do ar quando alguém troca a pasta de
 * assets. Pior: quatro rotas vazias com a mesma foto viram quatro telas que
 * parecem a mesma tela.
 *
 * `<EmptyArt>` resolve os três: é geometria em SVG derivada de `var(--brand)`
 * por `color-mix`, então ela É a marca de quem instalou — e muda de composição
 * conforme a semente, então "favoritos" e "arquivados" não se confundem. Zero
 * byte de rede, mesmo desenho em SSR e no cliente, e nada pra quebrar quando o
 * CDN cai. Mesma tese do `@visant/cover-art`, aplicada à faixa em vez da capa.
 * O slot `art` continua aberto: quem tem ilustração de marca passa a ilustração.
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
  /**
   * Caixa com borda e fundo de card, arte sangrando no topo. `false` tira a
   * caixa: o vazio pousa direto na superfície que o recebeu (painel, coluna,
   * lista), com a arte como um selo pequeno em cima do texto. É o modo certo
   * quando o vazio mora DENTRO de um card, pra não virar caixa dentro de caixa.
   */
  framed?: boolean;
}

export function EmptyState({
  art,
  eyebrow,
  title,
  action,
  framed = true,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        // `min-w-0`: sem isto a peça não sabe encolher dentro de um flex ou de
        // uma coluna de grid, e empurra o irmão do lado em vez de ceder.
        "@container min-w-0",
        framed && "overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card",
        className,
      )}
      {...props}
    >
      {art && !framed && (
        // Sem caixa a arte é selo, não faixa: centrada, do tamanho que veio, e
        // sem véu, porque nenhum texto pousa em cima dela.
        <div className="flex justify-center pt-2">{art}</div>
      )}

      {art && framed && (
        <div className="relative">
          {art}
          {/* Contraste garantido sobre qualquer arte, sem apagá-la. Ver a nota. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                // 58% e não 42%: com a arte ganhando altura, a cortina começava
                // ainda no meio do desenho e comia justamente a parte que o
                // report pediu pra crescer. O contrato continua o mesmo — opaco
                // onde o texto pousa, transparente onde não pousa.
                "linear-gradient(to bottom, transparent 0%, transparent 58%, var(--card) 100%)",
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
          !framed && "pb-2 @[22rem]:pb-2",
        )}
      >
        {eyebrow && (
          // Caixa de frase, sem caixa-alta espaçada: o eyebrow é contexto ("em
          // Favoritos"), não um selo gritando a categoria.
          <div className="mb-1.5 text-[length:var(--text-apoio,0.75rem)] text-muted-foreground">
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

/* ── a arte generativa ─────────────────────────────────────────────────────── */

/**
 * djb2, e ele mora aqui em vez de vir de um `@visant/cover-look`.
 *
 * São cinco linhas contra uma dependência a mais no `shadcn add` de um item que
 * hoje não puxa nada. Se um dia um terceiro item precisar do mesmo hash, aí sim
 * ele vira lib — três consumidores é a régua da casa, não dois.
 *
 * O importante não é o algoritmo e sim a propriedade: mesma semente, mesmo
 * desenho, no servidor e no cliente. `Math.random()` aqui daria hidratação
 * divergente e uma tela vazia que muda de cara a cada F5.
 */
function hashDe(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * A rampa inteira sai de `--brand` misturada com o papel do card.
 *
 * `color-mix` e não opacidade: um `fill` translúcido sobre `--card` dá o mesmo
 * resultado no tema claro e some no escuro, porque ali o papel é escuro e o
 * traço clareia. Misturando com a PRÓPRIA cor do card, a arte acompanha o tema
 * sem uma segunda paleta pra manter. `currentColor` é a rede pra quem instalou
 * e ainda não definiu `--brand`.
 */
const tom = (pct: number) =>
  `color-mix(in oklab, var(--brand, currentColor) ${pct}%, var(--card))`;

export interface EmptyArtProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * A semente. Passe o nome da coleção vazia (`"favoritos"`, `"arquivados"`) e
   * cada tela vazia do app ganha uma composição própria — de graça, e estável.
   */
  seed?: string;
  /** Densidade do desenho. Menos é mais em faixa baixa. */
  intensity?: "quieta" | "cheia";
}

/**
 * EmptyArt — a faixa desenhada em código pro slot `art`.
 *
 * Três composições, escolhidas pela semente: arcos (o que continua fora do
 * quadro), malha (o inventário que ainda não chegou) e faixas (o corte).
 * Nenhuma delas desenha texto, ícone ou objeto reconhecível de propósito — a
 * frase embaixo é que diz o que a tela é; a arte só dá superfície e marca.
 *
 * `aria-hidden`: é ornamento. Um `role="img"` aqui obrigaria a inventar uma
 * descrição pra uma coisa que não descreve nada, e o leitor de tela passaria a
 * ouvir "gráfico decorativo" antes da única frase que importa.
 */
export function EmptyArt({
  seed = "vazio",
  intensity = "quieta",
  className,
  style,
  ...props
}: EmptyArtProps) {
  const h = hashDe(seed);
  const familia = h % 3;
  // Cada aspecto lê uma fatia diferente do MESMO número — nada aqui precisa de
  // segunda semente, e é isso que mantém o desenho reproduzível.
  const giro = ((h >> 3) % 21) - 10;
  const cheia = intensity === "cheia";

  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden bg-card", className)}
      style={{
        // O clarão de fundo sai do mesmo token: sem ele o campo fica chapado e
        // a geometria parece colada, não iluminada.
        backgroundImage: `radial-gradient(120% 90% at ${20 + (h % 60)}% 0%, ${tom(16)}, var(--card) 70%)`,
        ...style,
      }}
      {...props}
    >
      {/* `slice` e não `meet`: a arte é CAMPO, não figura. Ela recorta pra
          preencher a faixa que receber, em qualquer proporção, em vez de
          encolher e deixar duas margens vazias — que é como um SVG decorativo
          denuncia que ninguém pensou na caixa. */}
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        {familia === 0 &&
          Array.from({ length: cheia ? 7 : 5 }).map((_, i) => (
            // Centro fora do quadro: o arco que não fecha é o que sugere que a
            // coleção continua além da tela vazia.
            <circle
              key={i}
              cx={64 + (h % 40)}
              cy={214}
              r={54 + i * 44}
              fill="none"
              stroke={tom(Math.max(6, 34 - i * 5))}
              strokeWidth={6 + ((h >> (i + 1)) % 5) * 3}
            />
          ))}

        {familia === 1 &&
          Array.from({ length: cheia ? 9 : 7 }).flatMap((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              const destaque = (r * 15 + c + h) % 13 === 0;
              return (
                <circle
                  key={`${r}-${c}`}
                  cx={16 + c * 26}
                  cy={18 + r * 24}
                  r={destaque ? 7 : 3.5}
                  fill={tom(destaque ? 60 : 22)}
                />
              );
            }),
          )}

        {familia === 2 && (
          <g transform={`rotate(${giro} 200 100)`}>
            {Array.from({ length: cheia ? 8 : 6 }).map((_, i) => (
              <rect
                key={i}
                x={-40 + i * 74}
                y={-80}
                width={16 + ((h >> (i * 2)) % 5) * 11}
                height={360}
                fill={tom(12 + (i % 3) * 13)}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
