"use client";

/**
 * O banco de mídia dentro da vitrine — e o botão que devolve o wireframe.
 *
 * O acervo é gerado por `scripts/media-bank.mjs`; aqui é só o consumo. Duas
 * perguntas mandam neste arquivo:
 *
 * ── Por que a demo não escolhe a imagem pelo nome do arquivo ────────────────
 * Ela pede um PAPEL (`retrato`, `cena`, `textura`, `video`) e um índice. Assim
 * trocar uma foto do acervo não exige abrir 12 demos, e nenhuma peça acaba com
 * o rosto de alguém do time de plano de fundo de um CTA. O índice é estável:
 * a mesma demo mostra a mesma imagem em todo carregamento, porque vitrine que
 * sorteia imagem a cada F5 impede comparar duas versões da mesma tela.
 *
 * ── Por que existe o modo wireframe ─────────────────────────────────────────
 * Foto boa esconde componente ruim. Um `masonry-gallery` com bastidor de
 * produção parece ótimo mesmo quando a malha está errada; em bloco cinza o
 * erro salta. O botão da barra troca as duas leituras em um clique — é a mesma
 * peça, sem a maquiagem — e a escolha fica no `localStorage`, porque quem
 * ligou o wireframe está no meio de um julgamento e não quer recomeçar a cada
 * navegação.
 */

import * as React from "react";
import { ImageOff, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import acervoBruto from "./media-bank.generated.json";

export type Papel = "retrato" | "cena" | "textura" | "video";

export interface Midia {
  id: string;
  papel: Papel;
  tipo: "imagem" | "video";
  src: string;
  /** Mesmo vídeo em VP9. Ver a nota do script: h264 não toca em Chromium livre. */
  webm?: string;
  poster?: string;
  alt: string;
  w: number;
  h: number;
}

export const ACERVO = acervoBruto as Midia[];

const PORmPAPEL = ACERVO.reduce<Record<string, Midia[]>>((acc, m) => {
  (acc[m.papel] ??= []).push(m);
  return acc;
}, {});

/**
 * A peça de acervo daquele papel, na posição pedida.
 *
 * O módulo é a chave: com 7 retratos e um índice 9, `9 % 7` devolve o terceiro
 * em vez de `undefined`. Uma demo que pede oito retratos não pode quebrar
 * porque o acervo tem sete — e nem repetir o mesmo em sequência.
 */
export function midia(papel: Papel, indice = 0): Midia | undefined {
  const lista = PORmPAPEL[papel];
  if (!lista?.length) return undefined;
  return lista[((indice % lista.length) + lista.length) % lista.length];
}

/**
 * A proporção real do arquivo, pronta para `aspect-ratio`.
 *
 * Existe para a malha (`masonry`) poder montar a coluna com o número que a foto
 * TEM, em vez de uma altura chutada. É a diferença entre testar a malha e testar
 * uma lista de retângulos que sempre fecham.
 */
export const proporcao = (papel: Papel, indice = 0) => {
  const m = midia(papel, indice);
  return m ? `${m.w}/${m.h}` : "4/3";
};

// ── o interruptor ────────────────────────────────────────────────────────────

const CHAVE = "visant:wireframe";
const WireframeCtx = React.createContext<{
  wireframe: boolean;
  alternar: () => void;
}>({ wireframe: false, alternar: () => {} });

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [wireframe, setWireframe] = React.useState(false);

  // Lê depois de montar, não no `useState`: em SSR/prerender `localStorage` não
  // existe, e ler no primeiro render entregaria HTML diferente do que o cliente
  // desenha em seguida.
  React.useEffect(() => {
    try {
      setWireframe(localStorage.getItem(CHAVE) === "1");
    } catch {
      /* modo privado, storage bloqueado: segue com mídia */
    }
  }, []);

  const alternar = React.useCallback(() => {
    setWireframe((v) => {
      try {
        localStorage.setItem(CHAVE, v ? "0" : "1");
      } catch {
        /* idem */
      }
      return !v;
    });
  }, []);

  const valor = React.useMemo(() => ({ wireframe, alternar }), [wireframe, alternar]);
  return <WireframeCtx.Provider value={valor}>{children}</WireframeCtx.Provider>;
}

export const useWireframe = () => React.useContext(WireframeCtx);

/**
 * O botão da barra. Um só, global — cada card com o seu viraria mais chrome.
 *
 * Ícone da casa, sem rótulo: o `title` diz o que ele faz e o `aria-pressed` diz
 * o estado, que o tom do botão também mostra.
 */
export function WireframeToggle({ className }: { className?: string }) {
  const { wireframe, alternar } = useWireframe();
  const Icone = wireframe ? ImageOff : ImageIcon;
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={wireframe}
      aria-label={wireframe ? "Mostrar a mídia real" : "Ver só o wireframe"}
      title={wireframe ? "Mostrar a mídia real" : "Ver só o wireframe"}
      className={cn("casa-icone alvo-toque", className)}
    >
      <Icone className="h-4 w-4" />
    </button>
  );
}

// ── o que as demos usam ──────────────────────────────────────────────────────

export interface MediaProps extends React.HTMLAttributes<HTMLDivElement> {
  papel: Papel;
  /** Posição no acervo daquele papel. Estável entre carregamentos. */
  indice?: number;
  /**
   * Proporção da caixa, ex.: `"4/3"`.
   *
   * Sem isto a página pula quando a imagem carrega — a não ser que quem chama
   * JÁ dê altura à caixa (`size-full` dentro de um slot medido), que é o caso
   * das peças que reservam o espaço da mídia por conta própria.
   */
  ratio?: string;
  /** Vídeo toca sozinho, mudo e em loop. Ignorado em papel de imagem. */
  autoPlay?: boolean;
}

/**
 * A caixa de mídia: foto, vídeo ou wireframe — sempre do mesmo tamanho.
 *
 * A proporção fica na caixa, não no arquivo. É o que garante que ligar o
 * wireframe não mexa em UM pixel de layout: se a troca reposicionasse a página,
 * a comparação entre "com mídia" e "sem mídia" deixaria de ser sobre a peça.
 */
export function Media({
  papel,
  indice = 0,
  ratio,
  autoPlay = true,
  className,
  style,
  ...props
}: MediaProps) {
  const { wireframe } = useWireframe();
  const item = midia(papel, indice);
  const [falhou, setFalhou] = React.useState(false);

  const caixa = cn("relative overflow-hidden bg-muted", className);
  const estilo = { ...(ratio ? { aspectRatio: ratio } : null), ...style };

  // Sem acervo, arquivo quebrado ou wireframe ligado: a mesma caixa riscada.
  // Um `<img>` quebrado com ícone de imagem partida seria a vitrine denunciando
  // um deploy sem `public/media` — e ninguém precisa desse tipo de honestidade.
  if (wireframe || !item || falhou) {
    return (
      <div
        className={cn(caixa, "border border-dashed border-border bg-muted/40")}
        style={estilo}
        role="img"
        aria-label={item?.alt ?? "Espaço reservado para mídia"}
        {...props}
      >
        <svg className="absolute inset-0 h-full w-full text-border" aria-hidden preserveAspectRatio="none">
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  return (
    <div className={caixa} style={estilo} {...props}>
      {item.tipo === "video" ? (
        <video
          poster={item.poster}
          // `playsInline` não é detalhe: sem ele o iOS abre o vídeo em tela
          // cheia no play e a demo some da vitrine.
          playsInline
          muted
          loop
          autoPlay={autoPlay}
          preload="metadata"
          aria-label={item.alt}
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover"
        >
          {/* WebM primeiro: o navegador pega a primeira fonte que sabe tocar, e
              o Chromium de build livre não sabe tocar h264. O mp4 fica para o
              Safari, que é o contrário disso. */}
          {item.webm ? <source src={item.webm} type="video/webm" /> : null}
          <source src={item.src} type="video/mp4" />
        </video>
      ) : (
        <img
          src={item.src}
          alt={item.alt}
          width={item.w}
          height={item.h}
          loading="lazy"
          decoding="async"
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
