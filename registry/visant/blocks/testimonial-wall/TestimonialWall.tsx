"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TestimonialWall — a parede de prova social com peças de tipos diferentes.
 *
 * A referência mistura, na mesma malha: citação escrita, número grande
 * ("1.291+ projetos"), retrato com nome sobreposto e depoimento em vídeo. Essa
 * mistura é o ponto — uma parede só de citação vira bloco de texto que ninguém
 * lê, e uma só de retrato não prova nada.
 *
 * O que resolvi aqui, e por quê:
 *
 * 1. **Um tipo por item, discriminado.** `kind` decide o desenho. Passar tudo
 *    como "card com children" devolve o problema para quem usa e a parede sai
 *    desalinhada no primeiro depoimento diferente.
 * 2. **Colunas de CSS, não grade calculada.** A ordem do DOM é a ordem de
 *    leitura, e depoimento tem altura imprevisível — `columns` + `break-inside`
 *    resolve sem medir nada em JS e sem reordenar quando a lista cresce.
 * 3. **O vídeo é um controle de verdade.** O botão sobre o pôster dá play e
 *    pause no `<video>` do próprio slot, aparece no hover e existe no toque.
 * 4. **O tom vem do token.** As cores pastel da referência são da marca de lá;
 *    aqui são `muted`, `brand` e `card` — a parede muda de marca sem tocar no
 *    componente.
 *
 * ── O que estava quebrado no auto-layout, e por quê ────────────────────────
 *
 * A contagem de colunas vinha de `sm:` e `lg:`, que leem a LARGURA DA JANELA.
 * Bloco de página não sabe onde vai ser montado: numa coluna de 700px dentro de
 * uma tela de 1600, a parede abria em três colunas de 230px e o depoimento saía
 * com seis palavras por linha. Agora a régua é `column-width`: a parede pede um
 * mínimo de 17rem por coluna e `columns` vira **teto**, não promessa. O navegador
 * escolhe pela largura real do container, sem media query e sem medir em JS.
 *
 * O segundo defeito era o buraco. Numa parede de colunas, **nenhuma coluna pode
 * ser mais baixa que o item mais alto** — e o retrato em 3/4 numa coluna de
 * 500px pedia 667px de altura, o que deixava as outras duas com 300px de vazio
 * embaixo. O retrato agora tem teto de altura e a foto corta por `object-cover`:
 * um retrato é reconhecível cortado, e uma parede com buraco não é parede.
 */

type Tone = "card" | "muted" | "brand";

const TONE: Record<Tone, string> = {
  card: "bg-[var(--card,var(--background))] border border-[var(--border)]",
  muted: "bg-[var(--muted)] text-[var(--foreground)]",
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
};

interface Base {
  id: string;
  tone?: Tone;
}

export interface QuoteItem extends Base {
  kind: "quote";
  quote: React.ReactNode;
  /** Manchete curta acima da citação — o que a pessoa diria em 5 palavras. */
  headline?: React.ReactNode;
  author?: string;
  role?: string;
  /** Foto pequena do autor. */
  avatar?: React.ReactNode;
  /** 0 a 5. Fora da faixa, não desenha. */
  rating?: number;
}

export interface StatItem extends Base {
  kind: "stat";
  value: React.ReactNode;
  label: React.ReactNode;
  footnote?: React.ReactNode;
}

export interface PortraitItem extends Base {
  kind: "portrait";
  /** A foto, por slot. */
  media: React.ReactNode;
  name: string;
  role?: string;
  /** Vira depoimento em vídeo: aparece o botão de play. */
  onPlay?: () => void;
  ratio?: string;
}

export type TestimonialItem = QuoteItem | StatItem | PortraitItem;

export interface TestimonialWallProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TestimonialItem[];
  /** Teto de colunas. A largura do container é quem decide quantas cabem. */
  columns?: 2 | 3 | 4;
  /** O que aparece quando ainda não há depoimento nenhum. */
  empty?: React.ReactNode;
}

/** Piso de largura de coluna: abaixo disso o depoimento vira poesia concreta. */
const COL_MIN = "15rem";

/**
 * Teto de altura do retrato.
 *
 * Não é gosto, é aritmética de parede: o item mais alto define a altura de TODAS
 * as colunas, então um retrato sem teto compra vazio para os vizinhos. 26rem é a
 * altura em que o retrato ainda é o maior item da parede sem ser o dobro do
 * segundo maior.
 */
const RETRATO_MAX = "26rem";

export function TestimonialWall({
  items,
  columns = 4,
  empty,
  className,
  ...props
}: TestimonialWallProps) {
  if (!items.length) {
    return (
      <div
        className={cn(
          "rounded-[var(--r-surface,1rem)] border border-dashed border-[var(--border)] p-10 text-center",
          "text-[14px] text-[var(--muted-foreground)]",
          className,
        )}
        {...props}
      >
        {empty ?? "Nenhum depoimento por aqui ainda."}
      </div>
    );
  }

  return (
    <div
      className={cn("gap-4", className)}
      {...props}
      // `columns: <largura> <teto>` — o navegador cabe quantas colunas de pelo
      // menos `COL_MIN` couberem, até o teto. É o mesmo resultado que a media
      // query dava numa página cheia, e o resultado CERTO dentro de container.
      // Depois do spread, e espalhando o `style` de quem usa: a contagem de
      // colunas é do componente, o resto continua sendo de quem chamou.
      style={{ columns: `${COL_MIN} ${columns}`, ...props.style }}
    >
      {items.map((item) => (
        <div key={item.id} className="mb-4 break-inside-avoid">
          <Card item={item} />
        </div>
      ))}
    </div>
  );
}

/**
 * O retrato, e o botão que finalmente faz alguma coisa.
 *
 * O que havia antes era um botão que só existia se `onPlay` fosse passado e que
 * chamava `onPlay` e mais nada. Nas paredes reais desta casa `onPlay` é
 * `() => {}` — ou seja, o controle estava lá, ficava sempre visível por cima da
 * foto, e apertar não fazia NADA. Botão que não faz nada é pior que botão
 * nenhum: gasta a confiança de todos os outros.
 *
 * Agora ele acha o `<video>` que veio no slot e dá play e pause nele de verdade,
 * com o desenho seguindo o estado. `onPlay` continua sendo chamado no play, pra
 * quem usa o evento pra abrir um lightbox ou marcar analytics — nada de
 * assinatura mudou.
 *
 * Aparecer só no hover é o pedido, e `no-hover` é a classe que sabe fazer isso
 * sem apagar o controle no celular: fica invisível no ponteiro fino, aparece no
 * hover e no foco de teclado, e é **sempre** visível em ponteiro grosso, onde
 * hover não existe.
 */
function Portrait({ item, shell }: { item: PortraitItem; shell: string }) {
  const caixa = React.useRef<HTMLDivElement>(null);
  const [video, setVideo] = React.useState<HTMLVideoElement | null>(null);
  const [tocando, setTocando] = React.useState(false);

  React.useEffect(() => {
    const v = caixa.current?.querySelector("video") ?? null;
    setVideo(v);
    if (!v) return;
    // O estado vem do elemento, nunca de uma variável nossa: o vídeo pode
    // pausar sozinho (aba escondida, economia de bateria do iOS) e aí o ícone
    // passaria a mentir sobre o que está acontecendo.
    const sincronizar = () => setTocando(!v.paused);
    sincronizar();
    v.addEventListener("play", sincronizar);
    v.addEventListener("pause", sincronizar);
    return () => {
      v.removeEventListener("play", sincronizar);
      v.removeEventListener("pause", sincronizar);
    };
  }, [item.id]);

  const temControle = !!video || !!item.onPlay;

  const alternar = () => {
    if (!video) {
      item.onPlay?.();
      return;
    }
    if (video.paused) {
      // `play()` devolve promessa e ela REJEITA quando o navegador barra a
      // reprodução. Sem o catch isso vira "unhandled rejection" no console de
      // quem instalou, por um clique que a pessoa nem viu falhar.
      void video.play().catch(() => undefined);
      item.onPlay?.();
    } else {
      video.pause();
    }
  };

  return (
    <figure
      // `group` só quando há controle: card que não faz nada não deve reagir ao
      // mouse — hover em coisa inerte promete um clique que não existe.
      // `w-full` não é enfeite: com `aspect-ratio` e `max-height` juntos numa
      // caixa de largura automática, o navegador prefere ENCOLHER a largura pra
      // manter a proporção — e o retrato saía 100px mais estreito que a coluna,
      // com uma canaleta vazia do lado. Largura fixada, quem cede é a altura, e
      // o corte fica por conta do `object-cover`.
      className={cn(shell, "relative isolate w-full", temControle && "group")}
      style={{
        aspectRatio: item.ratio ?? "3 / 4",
        // Ver a nota do cabeçalho: sem teto, o retrato define a altura das
        // colunas todas e abre buraco nas vizinhas.
        maxHeight: RETRATO_MAX,
      }}
    >
      <div
        ref={caixa}
        className={cn(
          "absolute inset-0 -z-10",
          "[&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover",
          temControle && [
            "[&_img]:transition-transform [&_img]:[transition-duration:var(--dur-slow)]",
            "[&_img]:ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            "group-hover:[&_img]:scale-[1.04] motion-reduce:group-hover:[&_img]:scale-100",
          ],
        )}
      >
        {item.media}
      </div>

      {temControle ? (
        <button
          type="button"
          onClick={alternar}
          aria-label={
            video
              ? tocando
                ? `Pausar o depoimento de ${item.name}`
                : `Tocar o depoimento de ${item.name}`
              : `Ver o depoimento de ${item.name}`
          }
          className={cn(
            "no-hover",
            "absolute right-3 top-3 grid size-11 place-items-center rounded-[var(--r-pill,9999px)]",
            "bg-[var(--background)] text-[var(--foreground)] [box-shadow:var(--e-raised)]",
            "transition-transform [transition-duration:var(--dur-press,120ms)]",
            "[transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            // Só o afundar do clique. O crescer no hover saiu: o botão já
            // ENTRA no hover, e duas coisas acontecendo no mesmo gesto viram
            // ruído em vez de resposta.
            "active:scale-95",
            "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]",
          )}
        >
          {tocando ? (
            <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M4.5 3h2.2v10H4.5zM9.3 3h2.2v10H9.3z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              className="size-4 translate-x-px"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5 3.5 12.5 8 5 12.5z" />
            </svg>
          )}
        </button>
      ) : null}

      {/* A legenda paga o próprio contraste: a foto atrás é imprevisível. */}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">
        <p className="text-[1.0625rem] font-semibold leading-[1.2]">{item.name}</p>
        {item.role ? <p className="text-[12px] leading-[1.4] opacity-85">{item.role}</p> : null}
      </figcaption>
    </figure>
  );
}

function Card({ item }: { item: TestimonialItem }) {
  const shell = cn(
    "overflow-hidden rounded-[var(--r-surface,1rem)]",
    TONE[item.tone ?? "card"],
  );

  if (item.kind === "stat") {
    return (
      <div className={cn(shell, "flex flex-col gap-3 p-[var(--pad-card,1.5rem)]")}>
        <strong className="[font-family:var(--font-display,inherit)] text-[clamp(2.25rem,1.8rem+2vw,3.25rem)] font-medium leading-none tracking-[-0.03em]">
          {item.value}
        </strong>
        <p className="text-balance text-[1.0625rem] font-medium leading-[1.25]">{item.label}</p>
        {item.footnote ? (
          <p className="text-pretty text-[13px] leading-[1.55] opacity-70">{item.footnote}</p>
        ) : null}
      </div>
    );
  }

  if (item.kind === "portrait") {
    return <Portrait item={item} shell={shell} />;
  }

  return (
    <figure className={cn(shell, "flex flex-col gap-3 p-[var(--pad-card,1.5rem)]")}>
      {item.avatar || item.author ? (
        <figcaption className="flex items-center gap-2.5">
          {item.avatar ? (
            <span className="size-9 shrink-0 overflow-hidden rounded-[var(--r-pill,9999px)] [&_img]:size-full [&_img]:object-cover">
              {item.avatar}
            </span>
          ) : null}
          <span className="min-w-0">
            {item.author ? (
              <span className="block truncate text-[15px] font-semibold leading-tight">
                {item.author}
              </span>
            ) : null}
            {item.role ? (
              <span className="block truncate text-[12px] leading-tight opacity-70">
                {item.role}
              </span>
            ) : null}
          </span>
        </figcaption>
      ) : null}

      {typeof item.rating === "number" && item.rating > 0 && item.rating <= 5 ? (
        <p aria-label={`${item.rating} de 5`} className="flex gap-0.5 text-[var(--brand)]">
          {Array.from({ length: Math.round(item.rating) }, (_, i) => (
            <svg key={i} aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
              <path d="m8 1.6 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.4 4.2 13.4l.7-4.3-3.1-3 4.3-.6z" />
            </svg>
          ))}
        </p>
      ) : null}

      {item.headline ? (
        <p className="text-balance text-[15px] font-semibold leading-[1.35]">{item.headline}</p>
      ) : null}

      <blockquote className="text-pretty text-[14px] leading-[1.6] opacity-80">
        {item.quote}
      </blockquote>
    </figure>
  );
}
