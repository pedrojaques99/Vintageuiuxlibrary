"use client";

/**
 * A demo da cortina mora sozinha porque ela puxa GSAP + ScrollTrigger (a
 * espiada de descoberta) — mesmo trato do marquee e da cena presa: a biblioteca
 * chega quando o card chega.
 *
 * O acervo não tem um par real de antes/depois, e inventar um com filtro CSS
 * seria pior: a peça passaria a ser julgada pelo filtro, e o defeito que ela
 * evita (a foto de cima ENCOLHER em vez de ser recortada) só aparece quando as
 * duas imagens são de fato distintas. Duas cenas diferentes mostram a cortina
 * pelo que ela é.
 *
 * A caixa cresceu de 440px para 620px pelo mesmo motivo: comparar duas fotos é
 * o produto da peça, e numa faixa de 293px de altura o "antes" e o "depois"
 * viram duas miniaturas. O punho, que era o bug reportado, também só se julga
 * em tamanho de foto — 28px sobre 440px e sobre 620px são duas leituras
 * diferentes do mesmo controle.
 *
 * ── "Descentralizado": onde estava, de fato ────────────────────────────────
 *
 * Não estava aqui dentro. A peça sempre esteve no meio do próprio palco — o
 * palco é que era mais estreito que o ladrilho. O `FitStage` desenha a demo na
 * largura declarada em `preview.w` e só escala PRA BAIXO, com origem no canto
 * superior esquerdo: com `w: 660` num ladrilho de duas colunas (~690px), sobra
 * uma faixa de trinta e poucos pixels sempre do lado direito, e o olho lê a
 * peça encostada na esquerda. Centrar mais o conteúdo não corrigiria nada,
 * porque o conteúdo já estava centrado.
 *
 * A correção é o `preview` cobrir o ladrilho inteiro e a peça ser ELÁSTICA
 * dentro dele: `w-full` com `max-w`, em vez de largura cravada. Assim a caixa
 * preenche o palco, o teto mantém a foto no tamanho em que ela se julga, e o
 * `justify-center` centra o que sobra — nas três larguras da grade e também na
 * página solo, onde não há palco nenhum.
 */

import * as React from "react";

import { Media } from "../media";
import { PhotoCompare } from "../../../registry/visant/ui/photo-compare";

export default function PhotoCompareDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center px-4">
      <PhotoCompare
        className="mx-auto w-full max-w-[620px] rounded-[var(--r-surface,0.875rem)] border border-border"
        ratio="3/2"
        before={<Media papel="cena" indice={2} className="size-full" />}
        after={<Media papel="cena" indice={5} className="size-full" />}
        beforeLabel="antes"
        afterLabel="depois"
      />
    </div>
  );
}
