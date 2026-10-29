"use client";

/*
 * Adaptado de Morph Select — https://uiarc.dev/components/morph-select — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Morph Select, o select cujo gatilho VIRA a lista.
 *
 * Um select comum abre um segundo objeto: o gatilho fica onde estava e uma
 * caixa nova aparece embaixo, com outra borda, outra sombra, outro raio. O olho
 * tem que ligar as duas coisas. Aqui é a mesma superfície que cresce: o gatilho
 * se alarga, desce, e a lista aparece DENTRO dele. Fechou, encolhe de volta ao
 * tamanho do rótulo. Não há o que ligar, porque nunca foram dois.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **O espaço do gatilho é reservado por um molde invisível.** A superfície
 *    é absoluta (precisa crescer por cima do conteúdo vizinho), então quem
 *    segura o lugar no fluxo é uma cópia invisível do gatilho fechado. O
 *    layout em volta nunca pula, aberto ou fechado.
 * 2. **Largura e altura animam de verdade, não por escala.** Escala achataria o
 *    texto e o raio no meio do caminho. São poucos px numa caixa pequena, o
 *    custo é nada; o raio passa de controle pra superfície por transição de CSS
 *    sobre o token, sem número cravado.
 * 3. **O foco nunca sai do gatilho.** A lista é apontada por
 *    `aria-activedescendant`: setas andam pelas opções (pulando as
 *    desabilitadas), Home/End vão às pontas, digitar uma letra pula pro rótulo
 *    que começa com ela, Esc fecha, Tab fecha sem escolher.
 * 4. **O realce desliza entre opções** (um elemento só, por `layoutId`), e o
 *    valor no gatilho rola pra cima ou pra baixo conforme a opção nova está
 *    acima ou abaixo da antiga na lista. A direção do giro é informação.
 *
 * Sem busca e sem grupos de propósito: pra lista longa ou texto livre, use um
 * combobox. Este é pra escolher um entre poucos, num formulário ou numa
 * barra de propriedades.
 */

export interface MorphSelectItem {
  value: string;
  label: string;
  /** Ícone à esquerda do rótulo (um `<Icone />` do lucide). */
  icon?: React.ReactNode;
  /** Linha curta à direita, como um atalho ou um preço. */
  meta?: string;
  disabled?: boolean;
}

export interface MorphSelectProps {
  /** Rótulo visível; também dá nome ao gatilho e à lista. */
  label: string;
  /** Guarda o rótulo só pra leitor de tela. */
  hideLabel?: boolean;
  items: MorphSelectItem[];
  /** Valor controlado. Sem ele, o select guarda o próprio estado. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string, item: MorphSelectItem) => void;
  /** Texto do gatilho quando nada foi escolhido. */
  placeholder?: string;
  /** Largura da superfície aberta, em px. Nunca menor que o gatilho. */
  panelWidth?: number;
  /** Altura da lista antes de rolar, em px. */
  maxListHeight?: number;
  /** A borda que fica parada enquanto a superfície cresce. Use `end` perto da margem direita. */
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
}

const MOLA = { type: "spring" as const, visualDuration: 0.28, bounce: 0.12 };
const ALTURA_GATILHO = 40;

const rolo: Variants = {
  entra: (d: number) => ({ opacity: 0, y: d * 12 }),
  fica: { opacity: 1, y: 0 },
  sai: (d: number) => ({ opacity: 0, y: d * -12 }),
};
const fade: Variants = { entra: { opacity: 0 }, fica: { opacity: 1 }, sai: { opacity: 0 } };

export function MorphSelect({
  label,
  hideLabel = false,
  items,
  value,
  defaultValue = null,
  onValueChange,
  placeholder = "Escolha",
  panelWidth = 260,
  maxListHeight = 280,
  align = "start",
  disabled,
  className,
}: MorphSelectProps) {
  const reduzido = !!useReducedMotion();
  const id = React.useId();
  const labelId = `${id}-rotulo`;
  const listaId = `${id}-lista`;

  const [interno, setInterno] = React.useState<string | null>(defaultValue);
  const atual = value === undefined ? interno : value;
  const escolhido = items.findIndex((i) => i.value === atual);
  const item = escolhido >= 0 ? items[escolhido] : undefined;

  const [aberto, setAberto] = React.useState(false);
  const [ativo, setAtivo] = React.useState(-1);
  const raizRef = React.useRef<HTMLDivElement>(null);
  const gatilhoRef = React.useRef<HTMLButtonElement>(null);
  const moldeRef = React.useRef<HTMLSpanElement>(null);
  const listaRef = React.useRef<HTMLUListElement>(null);
  const [fechado, setFechado] = React.useState({ w: 0 });
  const [alturaLista, setAlturaLista] = React.useState(0);

  // Direção do giro do valor: +1 quando a opção nova está abaixo da anterior.
  const anterior = React.useRef(escolhido);
  const direcao = escolhido >= anterior.current ? 1 : -1;
  React.useEffect(() => {
    anterior.current = escolhido;
  }, [escolhido]);

  React.useLayoutEffect(() => {
    const molde = moldeRef.current;
    const lista = listaRef.current;
    if (!molde || !lista) return;
    const medir = () => {
      // `offsetWidth` arredonda pra baixo, e o texto tem largura fracionária: meio pixel a menos
      // e o rótulo virava reticências ("Em andam…"). A largura USADA do estilo computado é
      // fracionária e não sofre com `transform: scale` de um ancestral (o retângulo sofre).
      const w = Math.ceil(parseFloat(getComputedStyle(molde).width) || molde.offsetWidth);
      setFechado((f) => (f.w === w ? f : { w }));
      setAlturaLista(Math.min(lista.scrollHeight, maxListHeight));
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(medir);
    obs.observe(molde);
    obs.observe(lista);
    return () => obs.disconnect();
  }, [maxListHeight, items.length]);

  // Clique fora fecha. Só escuta enquanto está aberto.
  React.useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  // Opção ativa sempre visível dentro da lista que rola.
  React.useEffect(() => {
    if (!aberto || ativo < 0) return;
    document.getElementById(`${id}-op-${ativo}`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, ativo, id]);

  const habilitados = items.map((i, n) => (i.disabled ? -1 : n)).filter((n) => n >= 0);
  const vizinho = (de: number, passo: number) => {
    if (!habilitados.length) return -1;
    const pos = habilitados.indexOf(de);
    if (pos < 0) return passo > 0 ? habilitados[0]! : habilitados[habilitados.length - 1]!;
    return habilitados[Math.min(habilitados.length - 1, Math.max(0, pos + passo))]!;
  };

  const abrir = () => {
    if (disabled) return;
    setAtivo(escolhido >= 0 && !items[escolhido]?.disabled ? escolhido : (habilitados[0] ?? -1));
    setAberto(true);
  };

  const escolher = (n: number) => {
    const alvo = items[n];
    if (!alvo || alvo.disabled) return;
    if (value === undefined) setInterno(alvo.value);
    onValueChange?.(alvo.value, alvo);
    setAberto(false);
    gatilhoRef.current?.focus();
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!aberto) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    const mapa: Record<string, () => void> = {
      ArrowDown: () => setAtivo((a) => vizinho(a, 1)),
      ArrowUp: () => setAtivo((a) => vizinho(a, -1)),
      PageDown: () => setAtivo((a) => vizinho(a, 8)),
      PageUp: () => setAtivo((a) => vizinho(a, -8)),
      Home: () => setAtivo(habilitados[0] ?? -1),
      End: () => setAtivo(habilitados[habilitados.length - 1] ?? -1),
      Enter: () => escolher(ativo),
      " ": () => escolher(ativo),
      Escape: () => setAberto(false),
    };
    if (e.key === "Tab") {
      setAberto(false);
      return;
    }
    const acao = mapa[e.key];
    if (acao) {
      e.preventDefault();
      acao();
      return;
    }
    // Uma letra pula pra próxima opção cujo rótulo começa com ela.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const letra = e.key.toLocaleLowerCase("pt-BR");
      const ordem = [...habilitados.filter((n) => n > ativo), ...habilitados.filter((n) => n <= ativo)];
      const achou = ordem.find((n) => items[n]!.label.toLocaleLowerCase("pt-BR").startsWith(letra));
      if (achou !== undefined) setAtivo(achou);
    }
  };

  const larguraAberta = Math.max(panelWidth, fechado.w);
  const transicao = reduzido ? { duration: 0 } : MOLA;

  const conteudoGatilho = (texto: string, icone?: React.ReactNode) => (
    <>
      {icone && <span className="flex shrink-0 text-muted-foreground [&>svg]:size-4">{icone}</span>}
      <span className="min-w-0 flex-1 truncate text-left">{texto}</span>
    </>
  );

  return (
    <div ref={raizRef} className={cn("inline-flex flex-col gap-1.5 text-sm", className)}>
      <span id={labelId} className={cn("font-medium text-foreground", hideLabel && "sr-only")}>
        {label}
      </span>

      <div className="relative" style={{ height: ALTURA_GATILHO }}>
        {/* O molde: cópia invisível do gatilho fechado. Segura o lugar no fluxo e dá a largura fechada. */}
        <span
          ref={moldeRef}
          aria-hidden="true"
          className="invisible inline-flex h-10 max-w-[16rem] items-center gap-2 border border-transparent pl-3 pr-9"
        >
          {conteudoGatilho(item?.label ?? placeholder, item?.icon)}
        </span>

        <motion.div
          initial={false}
          animate={{
            width: aberto ? larguraAberta : fechado.w || "auto",
            height: aberto ? ALTURA_GATILHO + alturaLista : ALTURA_GATILHO,
          }}
          transition={transicao}
          className={cn(
            "absolute top-0 z-20 overflow-hidden border border-border bg-card text-foreground",
            "transition-[border-radius,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]",
            align === "end" ? "right-0" : "left-0",
            // O anel de foco vai na superfície: dentro dela o `overflow-hidden` cortaria o anel do botão.
            aberto
              ? "rounded-[var(--r-surface)] [box-shadow:var(--e-overlay)]"
              : "rounded-[var(--r-control)] has-[button:focus-visible]:[box-shadow:var(--focus)]",
            disabled && "opacity-50",
          )}
        >
          <button
            ref={gatilhoRef}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={aberto}
            aria-controls={listaId}
            aria-labelledby={labelId}
            aria-activedescendant={aberto && ativo >= 0 ? `${id}-op-${ativo}` : undefined}
            disabled={disabled}
            onClick={() => (aberto ? setAberto(false) : abrir())}
            onKeyDown={aoTeclar}
            className={cn(
              // `[font:inherit]`: muito projeto (e o tema base do shadcn/Figma) estiliza `button`
              // com fonte própria; o molde é um `span` e mede na fonte do pai. Fontes diferentes
              // e o rótulo do gatilho virava reticências.
              "relative flex h-[38px] w-full items-center gap-2 pl-3 pr-9 outline-none [font:inherit]",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
              !item && "text-muted-foreground",
            )}
          >
            <span className="relative grid min-w-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={direcao} mode="popLayout">
                <motion.span
                  key={item?.value ?? "__vazio"}
                  custom={direcao}
                  variants={reduzido ? fade : rolo}
                  initial="entra"
                  animate="fica"
                  exit="sai"
                  transition={reduzido ? { duration: 0.12 } : { type: "spring", visualDuration: 0.24, bounce: 0 }}
                  className="flex min-w-0 items-center gap-2 [grid-area:1/1]"
                >
                  {conteudoGatilho(item?.label ?? placeholder, item?.icon)}
                </motion.span>
              </AnimatePresence>
            </span>
            <motion.span
              aria-hidden="true"
              className="absolute right-3 flex text-muted-foreground"
              initial={false}
              animate={{ rotate: aberto ? 180 : 0 }}
              transition={transicao}
            >
              <ChevronDown className="size-4" />
            </motion.span>
          </button>

          <ul
            ref={listaRef}
            id={listaId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            aria-hidden={!aberto || undefined}
            style={{ maxHeight: maxListHeight }}
            className={cn(
              "overflow-y-auto overscroll-contain px-1 pb-1 transition-opacity duration-[var(--dur-fast)] ease-[var(--ease-out)]",
              aberto ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {items.map((op, n) => {
              const marcado = n === escolhido;
              const realcado = n === ativo;
              return (
                <li
                  key={op.value}
                  id={`${id}-op-${n}`}
                  role="option"
                  aria-selected={marcado}
                  aria-disabled={op.disabled || undefined}
                  onPointerMove={() => !op.disabled && ativo !== n && setAtivo(n)}
                  onClick={() => escolher(n)}
                  className={cn(
                    "relative flex h-9 items-center gap-2 rounded-[var(--r-control)] px-2",
                    op.disabled ? "cursor-not-allowed text-muted-foreground opacity-50" : "cursor-pointer",
                  )}
                >
                  {realcado && (
                    <motion.span
                      layoutId={`${id}-realce`}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-[inherit] bg-muted"
                      transition={reduzido ? { duration: 0 } : { type: "spring", visualDuration: 0.2, bounce: 0 }}
                    />
                  )}
                  {op.icon && <span className="relative flex shrink-0 text-muted-foreground [&>svg]:size-4">{op.icon}</span>}
                  <span className="relative min-w-0 flex-1 truncate">{op.label}</span>
                  {op.meta && <span className="relative shrink-0 text-xs text-muted-foreground tabular-nums">{op.meta}</span>}
                  <Check
                    aria-hidden="true"
                    className={cn("relative size-4 shrink-0 text-foreground", marcado ? "opacity-100" : "opacity-0")}
                  />
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

export default MorphSelect;
