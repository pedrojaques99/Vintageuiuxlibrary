"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Plate — a placa onde a foto de catálogo senta.
 *
 * Colhida de um concept de e-commerce, e resolve um problema chato de verdade:
 * **foto de catálogo vem recortada sobre branco.** Jogada num fundo colorido ou
 * escuro, ela aparece como um retângulo branco duro — o defeito que a auditoria
 * chamou de "duas placas concorrentes" quando metade da página usava recorte e
 * a outra metade não.
 *
 * A saída não é recortar de novo nem pedir foto nova ao cliente: é multiplicar a
 * foto sobre uma placa clara. O branco do arquivo vira a placa, os pixels
 * escuros ficam. Uma placa só na página inteira, e a foto casa com o fundo sem
 * ninguém abrir o Photoshop.
 *
 * `isolation: isolate` é obrigatório: sem ele o `multiply` sangra para o que
 * estiver atrás da placa.
 *
 * ── Três coisas que faltavam, e a primeira era um bug ──────────────────────
 *
 * 1. **`duration-500` no zoom do hover.** Meio segundo num gesto de ponteiro é
 *    quase o dobro do teto da casa (300ms), e estava cravado em número em vez de
 *    token. Virou `--dur-base`.
 * 2. **O multiply era incondicional, e ele só serve pra UM tipo de arquivo.**
 *    `multiply` escurece tudo que não é branco. Numa foto de cena — produto no
 *    ambiente, fundo colorido, still com sombra — a placa não "some": ela come a
 *    imagem inteira e devolve uma mancha suja. Ou seja, a peça que existe pra
 *    salvar o recorte sobre branco estragava toda foto que não fosse recorte, e
 *    não tinha saída. `blend="normal"` é a saída, e o default segue `multiply`.
 * 3. **O produto flutuava.** Recorte sem sombra de contato paira no meio da
 *    caixa — é o que faz catálogo montado parecer colagem. `ground` desenha o
 *    chão: uma elipse curta e larga logo abaixo do produto. É a diferença entre
 *    "imagem dentro de um quadrado" e "objeto pousado numa superfície", e custa
 *    um gradiente.
 *
 * `badge` existe porque a etiqueta (esgotado, novo, -30%) sempre acaba sendo
 * escrita por fora com `absolute` e um `z-index` chutado por quem consome. O
 * canto é território da placa: ela já tem `isolate` e `overflow-hidden`.
 *
 * ── E faltava a placa ser uma placa ────────────────────────────────────────
 *
 * Duas correções que só aparecem quando a peça é usada de verdade:
 *
 * 4. **No tema escuro o multiply comia o produto.** A placa pintava `--muted`,
 *    que é escuro no escuro. `multiply` sobre fundo escuro escurece TUDO: o
 *    branco do arquivo vira o cinza da placa e o produto some junto. Ou seja, a
 *    peça que existe pra resolver recorte sobre branco só funcionava em metade
 *    dos temas. `surface="photo"` pinta a ilha clara que o multiply exige, nos
 *    dois temas, por `--plate-photo` — quem instala aponta o token pro papel da
 *    marca e a página inteira acompanha. Segue desligado por padrão: a placa
 *    já publicada não pode trocar de cor sozinha.
 * 5. **O chão era estático.** Sombra de contato que não responde ao ponteiro
 *    denuncia que é desenho, não apoio. No hover do card ela espalha e clareia
 *    junto com o zoom da foto — o produto levanta um dedo da superfície. É o
 *    mesmo gesto do zoom (nada muda de tamanho na página) e ele para inteiro
 *    em `prefers-reduced-motion`.
 */

export interface PlateProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /** Proporção da placa. Produto alto (stick, garrafa) pede 4/5 ou 3/4. */
  ratio?: string;
  /** Respiro entre o produto e a borda da placa. */
  inset?: number;
  /** Cresce um degrau no hover do card em volta. */
  zoomOnGroupHover?: boolean;
  as?: "div" | "span";
  /**
   * Como a foto se mistura com a placa.
   *
   * `"multiply"` (padrão) para recorte sobre branco — o branco vira placa.
   * `"normal"` para foto de cena, still com fundo próprio ou PNG com alpha, que
   * o multiply destruiria.
   */
  blend?: "multiply" | "normal";
  /**
   * Sombra de contato na base da placa. Faz o recorte pousar em vez de flutuar.
   *
   * Ela mora na base da PLACA, não na base do produto — a placa não tem como
   * saber onde a silhueta termina dentro de um `object-contain`. Vale pro
   * recorte de catálogo, que por convenção enquadra o produto ocupando o frame.
   * Produto pequeno e centralizado deixa a sombra solta embaixo; nesse caso o
   * conserto é o enquadramento da foto, não ligar o `ground`.
   */
  ground?: boolean;
  /** Etiqueta no canto superior esquerdo: "novo", "esgotado", "-30%". */
  badge?: React.ReactNode;
  /**
   * A superfície da placa.
   *
   * `"muted"` (padrão) segue o tema, e serve pra placa que é só moldura.
   * `"photo"` é a ilha clara nos dois temas — condição de existência do
   * `multiply`, que precisa de fundo claro pra devolver o produto. Redefina
   * `--plate-photo` pra casar com o papel da marca.
   */
  surface?: "muted" | "photo";
}

export function Plate({
  children,
  ratio = "4 / 5",
  inset = 20,
  zoomOnGroupHover = true,
  as: Tag = "div",
  blend = "multiply",
  ground = false,
  badge,
  surface = "muted",
  className,
  style,
  ...props
}: PlateProps) {
  return (
    <Tag
      className={cn(
        "relative block overflow-hidden [isolation:isolate]",
        surface === "muted" && "bg-[var(--muted)]",
        // A foto é filha direta; o blend e o zoom vivem aqui para o consumidor
        // só precisar passar um <img> ou um next/image.
        "[&_img]:relative [&_img]:z-[1] [&_img]:block [&_img]:size-full [&_img]:object-contain",
        blend === "multiply" && "[&_img]:mix-blend-multiply",
        /* Zoom de FOTO dentro de moldura com `overflow-hidden` — exceção
           deliberada à regra de não escalar no hover. O que a regra proíbe é o
           card inteiro inchar sob o cursor; aqui nada muda de tamanho na página,
           só o enquadramento da imagem dentro de uma caixa que não se mexe. */
        "[&_img]:transition-transform [&_img]:[transition-duration:var(--dur-base,200ms)] [&_img]:ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
        zoomOnGroupHover && "[.group:hover_&_img]:scale-[1.045]",
        className,
      )}
      style={{
        aspectRatio: ratio,
        padding: `${inset}px`,
        /* A ilha clara vai em `style`, e não em classe: o fallback é uma função
           de cor com vírgulas dentro de um `var()`, o tipo de valor arbitrário
           que o Tailwind às vezes recusa em silêncio — e recusar em silêncio,
           aqui, é a placa voltando a comer o produto no tema escuro. Claro de
           propósito nos dois temas: é a condição do `multiply`, não um gosto. */
        ...(surface === "photo"
          ? { background: "var(--plate-photo, oklch(0.97 0 0))" }
          : null),
        ...style,
      }}
      {...props}
    >
      {ground && (
        /*
         * O chão fica ATRÁS da foto (`z-0` contra o `z-[1]` da imagem) e por
         * baixo do `inset`, encostado na base da placa. Elipse larga e baixa,
         * porque sombra de contato é larga e baixa — um círculo desenharia uma
         * bola de luz e leria como brilho, não como apoio.
         *
         * `color-mix` sobre `--foreground`: no tema escuro a mesma regra produz
         * uma sombra clara, que é o comportamento certo, e nenhum hex entra aqui.
         */
        <div
          aria-hidden="true"
          /* No hover do card a elipse espalha e afina: é o produto levantando
             um dedo da superfície, o mesmo instante em que a foto dá o zoom.
             Só `transform` e `opacity` animam — as duas propriedades que o
             compositor resolve sem relayout. */
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[22%] origin-bottom",
            "transition-[transform,opacity] [transition-duration:var(--dur-base,200ms)] ease-[var(--ease-out,cubic-bezier(0.23,1,0.32,1))]",
            "[.group:hover_&]:scale-x-[1.14] [.group:hover_&]:opacity-70",
            "motion-reduce:transition-none motion-reduce:[.group:hover_&]:scale-x-100 motion-reduce:[.group:hover_&]:opacity-100",
          )}
          style={{
            background:
              "radial-gradient(ellipse 46% 52% at 50% 100%, color-mix(in oklch, var(--foreground) 22%, transparent), transparent 70%)",
          }}
        />
      )}

      {children}

      {badge && (
        // `z-[2]`: acima da foto e do chão. Sem a ordem explícita, o
        // `mix-blend-multiply` da imagem come a etiqueta em fundo claro.
        <div className="absolute left-0 top-0 z-[2] m-2">{badge}</div>
      )}
    </Tag>
  );
}
