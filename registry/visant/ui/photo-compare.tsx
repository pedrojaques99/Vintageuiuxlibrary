"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronsLeftRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Photo Compare — a cortina entre o antes e o depois.
 *
 * A peça que toda apresentação de rebrand, retoque e redesenho pede, e que
 * quase sempre é feita errada de dois jeitos diferentes.
 *
 * ── Erro 1: redimensionar em vez de recortar ──────────────────────────────
 *
 * A implementação intuitiva é dar `width` variável à camada de cima. Aí a
 * imagem de cima **encolhe junto** com a cortina: aos 20% você está comparando
 * um "depois" espremido a 20% da largura com um "antes" inteiro. A comparação
 * fica desonesta exatamente no lugar onde ela é o produto.
 *
 * Aqui a camada de cima tem SEMPRE a caixa inteira, e o que muda é o
 * `clip-path`. As duas fotos ficam na mesma escala, no mesmo lugar, o tempo
 * todo — a cortina só decide qual metade você vê.
 *
 * ── Erro 2: escrever o arrasto na mão ─────────────────────────────────────
 *
 * `pointerdown` + `pointermove` + `setPointerCapture` + limites + `pointerup`
 * é meia tarde de código, e aí falta o teclado, falta o leitor de tela, falta
 * `Home`/`End`, falta RTL, falta o toque que também rola a página.
 *
 * O navegador já implementa tudo isso: é `<input type="range">`. Ele fica
 * invisível por cima da caixa inteira e é ele quem manda no valor — arrastar em
 * qualquer ponto funciona porque o próprio range pula pro ponto do clique e
 * segue o dedo. O que desenhamos é só a alça, e ela é `pointer-events: none`
 * para nunca roubar o gesto do controle de verdade.
 *
 * Consequência boa e de graça: setas movem 1%, `shift` move 10%, `Home`/`End`
 * vão pras pontas, e o leitor de tela anuncia porcentagem.
 *
 * ── As outras decisões ────────────────────────────────────────────────────
 *
 * 1. **`touch-action: pan-y`.** Sem isso o dedo que queria descer a página
 *    arrasta a cortina, e a pessoa fica presa na foto. Com isso, vertical rola
 *    a página e horizontal move a cortina — que é o que a mão espera.
 * 2. **Os rótulos são recortados junto com a foto de que fazem parte.** Cada um
 *    mora na sua camada, então "depois" some quando a cortina passa por cima
 *    dele. Um rótulo fixo por fora mentiria na metade do caminho.
 *
 *    O preço disso: o rótulo é filho direto da camada, igual à foto. A regra
 *    que manda a mídia preencher a caixa pegava o `<span>` junto e o
 *    transformava num bloco de 100% com o texto encalhado no canto de cima —
 *    parecia posicionamento errado e era o seletor. Por isso ela exclui o
 *    rótulo por nome. Toda vez que uma camada tem mídia E cromo, o `> *` é
 *    largo demais.
 * 3. **A espiada.** Na primeira vez que a peça entra em tela, a cortina anda
 *    sozinha e volta — é assim que a pessoa descobre que dá pra arrastar.
 *    Sem ela, metade das visitas lê a peça como uma foto só. Acontece UMA vez,
 *    e some inteira sob `prefers-reduced-motion`: quem pediu menos movimento
 *    ainda vê as duas fotos e ainda tem o controle.
 * 4. **A espiada não pode brigar com a mão.** Se a pessoa tocar no controle
 *    antes de a demonstração terminar, ela é morta na hora. Animação que
 *    disputa o dedo do usuário é pior que animação nenhuma.
 * 5. **Proporção declarada.** Duas fotos empilhadas em posição absoluta não têm
 *    altura própria; sem `ratio` a caixa nasce com zero de altura e a peça
 *    "não aparece" sem erro nenhum.
 */

gsap.registerPlugin(ScrollTrigger);

/**
 * O punho e a costura, e por que eles moram aqui e não no bloco `css` do item.
 *
 * O bloco `css` desenhava `.photo-compare-grip` como um disco de 2,25rem
 * preenchido com `var(--brand)`, e a costura como um fio da marca. Dois
 * reports em sequência: primeiro "bola azul gigante", depois "seta fora do
 * alinhamento com a linha" e "menos azul". As duas coisas tinham causa.
 *
 * - **O desalinhamento era a grade.** A costura é uma coluna de 2px com
 *   `place-items: center`, e um filho de 28px numa trilha de 2px não centra:
 *   ele transborda pra um lado só, e o punho saía com a borda esquerda colada
 *   na linha. Agora o punho é `absolute` no meio exato da costura
 *   (`left/top 50%` + `translate -50%`), sem depender de alinhamento de grade.
 * - **A cor era a marca em cima da foto.** Sobre imagem, a marca disputa com
 *   o conteúdo que a peça existe pra mostrar. Costura e punho agora são da
 *   superfície (`--background`), com sombra curta pra destacar em qualquer
 *   foto, clara ou escura. A marca fica só no anel de foco, que é estado.
 *
 * Mora em utilitária, e não numa reescrita do bloco `css`, pelo mesmo motivo
 * do `@visant/spine-card`: utilitária ganha de `@layer components` por camada,
 * então quem instalou pelo `shadcn add` recebe ESTE desenho mesmo com o bloco
 * antigo ainda na folha. As classes antigas ficam no lugar para o seletor de
 * foco do bloco continuar casando.
 */
const COSTURA = [
  "bg-[var(--background)]",
  "[box-shadow:0_0_0_0.5px_color-mix(in_oklab,var(--foreground)_18%,transparent),0_0_10px_color-mix(in_oklab,black_30%,transparent)]",
].join(" ");

const PUNHO = [
  "photo-compare-grip",
  "absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[var(--r-pill,9999px)]",
  "bg-[var(--background)] text-[var(--foreground)]",
  "[box-shadow:0_0_0_1px_color-mix(in_oklab,var(--foreground)_14%,transparent),0_4px_14px_color-mix(in_oklab,black_32%,transparent)]",
].join(" ");

export interface PhotoCompareProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** A foto de baixo — o estado original. */
  before: React.ReactNode;
  /** A foto de cima, revelada pela cortina. */
  after: React.ReactNode;
  beforeLabel?: React.ReactNode;
  afterLabel?: React.ReactNode;
  /** Proporção da caixa, formato CSS. Obrigatória na prática: ver decisão 5. */
  ratio?: string;
  /** Posição inicial da cortina, 0 a 100. */
  defaultValue?: number;
  /** Desliga a espiada de descoberta. */
  peek?: boolean;
  /** Rótulo do controle para leitor de tela. */
  label?: string;
  onValueChange?: (v: number) => void;
}

export function PhotoCompare({
  before,
  after,
  beforeLabel = "antes",
  afterLabel = "depois",
  ratio = "3/2",
  defaultValue = 50,
  peek = true,
  label = "Comparar antes e depois",
  onValueChange,
  className,
  style,
  ...props
}: PhotoCompareProps) {
  const [pos, setPos] = React.useState(defaultValue);
  const raizRef = React.useRef<HTMLDivElement>(null);
  const tocado = React.useRef(false);

  React.useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz || !peek) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alvo = { v: defaultValue };
    const ctx = gsap.context(() => {
      gsap.to(alvo, {
        v: defaultValue > 50 ? defaultValue - 22 : defaultValue + 22,
        duration: 0.9,
        // `inOut` porque a cortina está se MOVENDO na tela, com as duas pontas
        // conhecidas — não é entrada nem saída. É o mesmo critério do
        // `@visant/photo-flip`, e o contrário do `@visant/photo-frame`.
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1,
        delay: 0.35,
        scrollTrigger: { trigger: raiz, start: "top 80%", once: true },
        // A cada quadro o React recebe o valor: assim existe UMA fonte para a
        // posição, e a espiada não é um caminho paralelo que desenha por fora.
        onUpdate: () => {
          if (tocado.current) return;
          setPos(alvo.v);
        },
      });
    }, raiz);

    return () => ctx.revert();
  }, [peek, defaultValue]);

  const mudar = (v: number) => {
    // O primeiro toque cala a espiada — ver decisão 4. A guarda vive no
    // `onUpdate` da timeline, e não num `kill()`: matar o tween no meio
    // deixaria a cortina parada onde estava, e a posição do dedo já é a
    // resposta certa. O tween continua rodando pra ninguém, e morre sozinho.
    tocado.current = true;
    setPos(v);
    onValueChange?.(v);
  };

  return (
    <div
      ref={raizRef}
      className={cn("photo-compare", className)}
      style={{ "--ratio": ratio, "--p": `${pos}%`, ...style } as React.CSSProperties}
      {...props}
    >
      <div className="photo-compare-layer">
        {before}
        {beforeLabel ? (
          <span className="photo-compare-label photo-compare-label-before">{beforeLabel}</span>
        ) : null}
      </div>

      {/* A camada de cima tem a caixa INTEIRA e é recortada — nunca redimensionada. */}
      <div className="photo-compare-layer photo-compare-after" aria-hidden="true">
        {after}
        {afterLabel ? (
          <span className="photo-compare-label photo-compare-label-after">{afterLabel}</span>
        ) : null}
      </div>

      <span aria-hidden="true" className={cn("photo-compare-seam", COSTURA)}>
        <span className={PUNHO}>
          {/* Duas setas, e não um disco liso: a alça precisa DIZER que arrasta
              de lado. Sem o sinal ela vira um ponto no meio da foto. */}
          <ChevronsLeftRight className="size-4" strokeWidth={2} />
        </span>
      </span>

      {/* O controle de verdade. Invisível, do tamanho da caixa, e é dele que
          vêm teclado, toque, leitor de tela e o arrasto — nenhum deles escrito
          aqui dentro. */}
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={pos}
        onChange={(e) => mudar(Number(e.target.value))}
        onPointerDown={() => (tocado.current = true)}
        className="photo-compare-input"
        aria-label={label}
        aria-valuetext={`${Math.round(pos)}% do depois`}
      />
    </div>
  );
}
