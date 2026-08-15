"use client";

/**
 * Profundidade se lê em MALHA, não em foto.
 *
 * A versão anterior desta demo tinha razão pela metade: trocou três retângulos
 * cinzas por uma colagem fotográfica porque paralaxe é oclusão e oclusão pede
 * matéria distinta. O que ela não previu é que foto é matéria CONTÍNUA — sem
 * arestas repetidas, deslocar uma fotografia 9px não lê como plano se afastando,
 * lê como foto tremendo. O report devolveu exatamente isso: "fundo com grid, não
 * imagem".
 *
 * Malha resolve porque ela tem periodicidade. Duas grades com passos diferentes
 * (18px e 84px) movendo-se em velocidades diferentes produzem deslizamento
 * relativo VISÍVEL: o olho tem uma régua para comparar, que é o que a foto não
 * oferecia. É o mesmo motivo pelo qual todo starfield de jogo é feito de pontos.
 *
 * Os passos são primos entre si de propósito. Duas malhas de 18px e 36px batem
 * a cada dois quadrados e produzem moiré — um chuvisco que se move e que ninguém
 * consegue nomear, só sentir como sujeira.
 *
 * `--d` é a profundidade em px no extremo do movimento, e ela cresce do fundo
 * para a frente: a malha fina quase não anda, a assinatura anda quinze vezes
 * mais. As camadas de fundo sangram (`-inset-*`) porque uma camada deslocada
 * 10px para a esquerda mostraria 10px de vazio na borda direita — quem sangra é
 * sempre a camada mais funda.
 */

import * as React from "react";

import { usePointerParallax } from "../../../registry/visant/hooks/use-pointer-parallax";

/** O CSS decide a profundidade de cada objeto; o hook só escreve `--px/--py`. */
const desloca = (d: number) => ({
  transform: `translate3d(calc(var(--px, 0) * ${d}px), calc(var(--py, 0) * ${d}px), 0)`,
});

/** Pontos. O plano mais fundo — passo curto para virar textura, não desenho. */
const PONTOS = {
  backgroundImage:
    "radial-gradient(circle, color-mix(in oklab, var(--foreground) 26%, transparent) 1px, transparent 1.2px)",
  backgroundSize: "18px 18px",
};

/** Linhas. O plano médio: passo longo, primo do de cima, para não bater moiré. */
const LINHAS = {
  backgroundImage:
    "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
  backgroundSize: "84px 84px",
};

/** Malha da marca: só um retalho dela, e é o que dá cor à cena sem virar bloco. */
const MALHA_MARCA = {
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklab, var(--brand) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--brand) 55%, transparent) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

export default function PointerParallaxDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  usePointerParallax(ref);

  return (
    // `min-h`: todos os planos são absolutos, então a caixa não tem altura
    // própria. Dentro do palco isso não aparece (o palco dá a altura), mas na
    // página solo a cena colapsava numa linha de 1px — e é a página solo que a
    // suíte de responsivo mede.
    <div
      ref={ref}
      className="relative h-full min-h-[300px] w-full overflow-hidden rounded-[var(--r-surface,0.875rem)] border border-border bg-card"
    >
      {/* plano 1 — a poeira, quase parada */}
      <div aria-hidden className="absolute -inset-4 opacity-70" style={{ ...PONTOS, ...desloca(7) }} />

      {/* plano 2 — a grade grossa, o chão da cena */}
      <div aria-hidden className="absolute -inset-6" style={{ ...LINHAS, ...desloca(18) }} />

      {/* plano 3 — o retalho de marca. Sólido de um lado, malha do outro: é a
          aresta entre os dois que denuncia o deslocamento. */}
      <div
        aria-hidden
        className="absolute left-[8%] top-[18%] h-[54%] w-[30%] overflow-hidden rounded-[var(--r-control,0.5rem)] border border-border"
        style={{ ...desloca(34), background: "color-mix(in oklab, var(--brand) 14%, var(--card))" }}
      >
        <div className="absolute inset-0" style={MALHA_MARCA} />
      </div>

      {/* plano 3b — a moldura vazia, o contraponto. Duas figuras à mesma
          profundidade dizem que ali existe um plano, e não um objeto solto. */}
      <div
        aria-hidden
        className="absolute right-[14%] top-[26%] h-[38%] w-[22%] rounded-[var(--r-control,0.5rem)] border-2 border-[var(--brand)] [box-shadow:var(--e-raised)]"
        style={{ ...desloca(34), background: "var(--card)" }}
      />

      {/* plano 4 — a assinatura, colada no vidro */}
      <div
        className="absolute bottom-[16%] right-[8%] rounded-[var(--r-pill,9999px)] px-3 py-1.5 text-corpo font-medium"
        style={{
          ...desloca(52),
          background: "var(--brand)",
          color: "var(--brand-foreground)",
        }}
      >
        Visant®
      </div>

      <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-micro text-muted-foreground">
        mova o ponteiro
      </span>
    </div>
  );
}
