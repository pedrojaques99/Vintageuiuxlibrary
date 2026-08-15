"use client";

import * as React from "react";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Loader de rota da marca — o símbolo da casa no centro da tela.
 *
 * Substitui os `loading.tsx` genéricos (spinner cru / skeleton chutado). NÃO
 * substitui os skeletons internos dos componentes-cliente (SWR `isLoading`,
 * data-table), que refletem o dado real chegando — esses são a inteligência de
 * cada página e ficam intactos.
 *
 * `prefers-reduced-motion`: mostra o símbolo parado (sem loop/autoplay).
 *
 * ── Por que o `src` é PROP, e não um caminho fixo ──────────────────────────
 *
 * A versão anterior apontava para `/assets/brand/Octahedron-vsn-lines.lottie`,
 * um arquivo que nunca foi versionado neste repo. O servidor devolvia o
 * `index.html` da SPA, o dotlottie logava "Invalid Lottie JSON string" e o
 * componente renderizava NADA — tela em branco no lugar exato onde a pessoa
 * está esperando. Pior: quem instalasse pelo registry herdava o caminho de um
 * arquivo que também não existe no projeto dela.
 *
 * O arquivo de animação é ativo de marca, e ativo de marca é do projeto, não do
 * componente. Então ele entra por `src`. Duas garantias que vêm junto:
 *
 * 1. **Sem `src`, ou com um `src` que falha, existe um estado de espera
 *    desenhado.** É um wireframe geométrico neutro — deliberadamente NÃO é o
 *    símbolo da Visant, porque inventar arte de marca seria pior que não ter
 *    nenhuma. Ele gira em `linear`: movimento constante não sugere progresso
 *    que não existe.
 * 2. **A falha grita.** `console.error` nomeando o componente e a prop, uma vez
 *    por montagem. Um loader que quebra em silêncio custa horas de quem
 *    instalou; o console é onde essa pessoa vai olhar.
 */

const AVISO_SEM_SRC =
  "[OctahedronLoader] sem `src`: nenhum arquivo .lottie foi informado, então " +
  "está no estado de espera genérico. Passe o .lottie da marca: " +
  "<OctahedronLoader src=\"/assets/brand/simbolo.lottie\" />";

/** Chaves já gritadas no console. Módulo, não componente: o aviso é do projeto. */
const jaAvisado = new Set<string>();

export interface OctahedronLoaderProps {
  /**
   * O contrato é tela cheia (`min-h-screen`) — ele substitui a rota inteira
   * enquanto ela carrega. Dentro de uma caixa menor, passe `min-h-0` aqui: o
   * `cn` resolve o conflito a favor de quem chama.
   */
  className?: string;
  /**
   * Caminho do `.lottie` (ou `.json` do Lottie) do símbolo da marca. Sem ele o
   * loader cai no wireframe genérico e avisa no console.
   */
  src?: string;
  /** Lado do símbolo em px. */
  size?: number;
  /** Texto lido por leitor de tela. */
  label?: string;
}

export function OctahedronLoader({
  className,
  src,
  size = 96,
  label = "Carregando",
}: OctahedronLoaderProps) {
  const reduceMotion = useReducedMotion();
  const [falhou, setFalhou] = React.useState(false);

  React.useEffect(() => {
    // Uma vez por sessão, não por montagem: este loader monta a cada troca de
    // rota, e um console com 40 linhas iguais deixa de ser aviso e vira ruído —
    // some junto com o erro que a pessoa está caçando.
    if (!src && !jaAvisado.has("sem-src")) {
      jaAvisado.add("sem-src");
      console.error(AVISO_SEM_SRC);
    }
  }, [src]);

  const mostraFallback = !src || falhou;

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "flex min-h-screen w-full items-center justify-center",
        className,
      )}
    >
      {mostraFallback ? (
        <Wireframe size={size} parado={!!reduceMotion} />
      ) : (
        <DotLottieReact
          src={src}
          loop={!reduceMotion}
          autoplay={!reduceMotion}
          style={{ width: size, height: size }}
          dotLottieRefCallback={(dl) => {
            // O dotlottie não tem prop de erro: o aviso vem pelo evento. Sem
            // isso, um `src` errado (404 que devolve HTML, arquivo corrompido)
            // continuaria sendo tela em branco — o defeito original.
            dl?.addEventListener("loadError", (e) => {
              if (!jaAvisado.has(src)) {
                jaAvisado.add(src);
                console.error(
                  `[OctahedronLoader] o .lottie de "${src}" não carregou.`,
                  e,
                );
              }
              setFalhou(true);
            });
          }}
        />
      )}
    </div>
  );
}

/**
 * Espera desenhada quando não há arquivo de marca: dois losangos em fio, um
 * girando e um pulsando. Geometria primitiva de propósito — não é o símbolo da
 * casa, e não deve passar por ele.
 *
 * `linear` e `2.4s` são exceção consciente às durações de UI: isto é uma espera
 * em laço, não um controle respondendo a clique — movimento constante, sem
 * aceleração que sugira progresso.
 */
function Wireframe({ size, parado }: { size: number; parado: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="text-muted-foreground"
    >
      <g
        style={
          parado
            ? undefined
            : { animation: "visant-octa-spin 2.4s linear infinite", transformOrigin: "24px 24px" }
        }
      >
        <path
          d="M24 4 L42 24 L24 44 L6 24 Z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
          opacity="0.5"
        />
        <path
          d="M6 24 L24 16 L42 24 M24 16 L24 44"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
          opacity="0.3"
        />
      </g>
      {/* O `style` fica no próprio SVG porque a peça do registry não pode
          depender de uma keyframe existir no CSS global do projeto que a
          instalou. */}
      <style>{`@keyframes visant-octa-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}
