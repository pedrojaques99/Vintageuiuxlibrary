"use client";

/* Adaptado de Reactions — https://uiarc.dev/components/reactions — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui). */

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "motion/react";
import { Check, SmilePlus, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Reactions — a barra de reações embaixo de comentário, post ou nota de versão.
 *
 * Cada pílula é uma reação e quantas pessoas escolheram. As que são SUAS ganham
 * a marca na borda e no fundo, e o ícone ganha preenchimento: o estado nunca
 * depende só de cor. O botão do fim abre a bandeja com todas as opções, que
 * cresce de dentro dele. Serve pra reconhecimento rápido; quando a pessoa
 * precisa dizer algo específico, o lugar é um campo de resposta.
 *
 * ── O que não é óbvio ──────────────────────────────────────────────────────
 *
 * 1. **Só o dígito que mudou rola.** De 19 pra 20 os dois giram; de 12 pra 13,
 *    só o 3. E rola na direção em que a contagem andou: sobe quando ganha,
 *    desce quando perde. A janela do número acompanha a largura numa mola, então
 *    9 pra 10 não empurra a pílula num quadro.
 * 2. **O ícone leva um impulso, não um keyframe.** Começa parado com
 *    velocidade, passa do ponto e assenta. Dois toques rápidos SOMAM movimento
 *    em vez de recomeçar a animação.
 * 3. **Pílula que zera sai da barra, e o foco não cai na página.** Se ela era o
 *    foco, ele passa pra vizinha, ou pro botão de adicionar.
 * 4. **A barra quebra linha numa mola.** Quando uma pílula nova empurra pra
 *    segunda fileira, a altura segue sem chacoalhar o conteúdo de baixo. Só
 *    anima depois de uma troca de reação: fonte que chega atrasada pula seco.
 * 5. **A bandeja tem uma parada de Tab.** Dentro dela, setas andam e Home/End
 *    vão às pontas; a legenda embaixo diz o nome da opção em foco, pra ícone
 *    nenhum ter que se explicar sozinho.
 *
 * Tudo responde a gesto, então nada passa dos 300 ms. Com
 * `prefers-reduced-motion` as trocas são de opacidade e o número troca seco.
 */

export interface ReactionOption {
  id: string;
  /** Nome falado da reação ("Curti", "Comemorar"). Vai pro leitor de tela e pra dica. */
  label: string;
  icon: LucideIcon;
}

export interface Reaction {
  id: string;
  count: number;
  /** Se quem está vendo já reagiu com esta. */
  reacted: boolean;
}

export interface ReactionsProps {
  /** Todas as reações que a bandeja oferece, na ordem da bandeja. */
  options: ReactionOption[];
  /** Controlado. As pílulas seguem esta ordem; contagem zero sai da barra. */
  value?: Reaction[];
  defaultValue?: Reaction[];
  /** Recebe a lista nova e a troca que a produziu. */
  onValueChange?: (next: Reaction[], change: { id: string; reacted: boolean }) => void;
  /** Nome da barra pro leitor de tela. */
  label?: string;
  className?: string;
}

// Molas da casa, aparadas no teto de 300 ms de resposta a gesto.
const MOLA_TOQUE = { type: "spring", visualDuration: 0.26, bounce: 0.12 } as const;
const MOLA_FORMA = { type: "spring", visualDuration: 0.3, bounce: 0.14 } as const;
const MOLA_LISA = { type: "spring", visualDuration: 0.3, bounce: 0 } as const;
// O parente em JS do `--ease-out`.
const SAIDA = [0.16, 1, 0.3, 1] as const;
const RAPIDO = 0.16;

const nada = () => () => {};
/** Movimento reduzido só conta depois de hidratar: servidor e cliente desenham igual. */
function useReduzir() {
  const hidratado = React.useSyncExternalStore(nada, () => true, () => false);
  return !!useReducedMotion() && hidratado;
}

/**
 * Segue o tamanho natural do conteúdo. Depois que `chave` muda, o tamanho vai
 * numa mola; qualquer outro redimensionamento (fonte atrasada, refluxo) pula
 * seco, pra nada balançar no carregamento.
 */
function useSeguirTamanho(
  conteudo: React.RefObject<HTMLElement | null>,
  eixo: "width" | "height",
  chave: string,
  reduzir: boolean,
  mola: Transition,
) {
  const tamanho = useMotionValue<number | "auto">("auto");
  const ultima = React.useRef(chave);
  const armadoAte = React.useRef(0);

  React.useLayoutEffect(() => {
    if (ultima.current === chave) return;
    ultima.current = chave;
    armadoAte.current = performance.now() + 700;
  }, [chave]);

  React.useEffect(() => {
    const no = conteudo.current;
    if (!no || typeof ResizeObserver === "undefined") return;
    let medido = false;
    let anim: AnimationPlaybackControls | undefined;
    // borderBoxSize ignora transform: a pílula ainda crescendo informa a largura
    // real, e o palco escalado da vitrine não encolhe a medida.
    const obs = new ResizeObserver(([e]) => {
      if (!e) return;
      const caixa = e.borderBoxSize?.[0];
      const prox = caixa
        ? eixo === "width"
          ? caixa.inlineSize
          : caixa.blockSize
        : eixo === "width"
          ? no.offsetWidth
          : no.offsetHeight;
      anim?.stop();
      if (!medido || reduzir || performance.now() > armadoAte.current) {
        medido = true;
        tamanho.jump(prox);
        return;
      }
      anim = animate(tamanho, prox, mola);
    });
    obs.observe(no, { box: "border-box" });
    return () => {
      obs.disconnect();
      anim?.stop();
    };
  }, [eixo, conteudo, reduzir, tamanho, mola]);

  return tamanho;
}

const borrar = (px: number) => `blur(${px}px)`;

const digitoVai: Variants = {
  enter: (dir: number) => ({ opacity: 0, y: `${dir * 0.55}em`, filter: borrar(2) }),
  center: { opacity: 1, y: "0em", filter: borrar(0) },
  exit: (dir: number) => ({
    opacity: 0,
    y: `${dir * -0.55}em`,
    filter: borrar(2),
    transition: { duration: RAPIDO, ease: SAIDA },
  }),
};
const digitoParado: Variants = {
  enter: { opacity: 1 },
  center: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
};
const digitoTransicao = {
  y: MOLA_TOQUE,
  opacity: { duration: RAPIDO, ease: SAIDA },
  filter: { duration: RAPIDO, ease: SAIDA },
};

function Contagem({ value, reduzir }: { value: number; reduzir: boolean }) {
  const [rolo, setRolo] = React.useState({ value, dir: 1 });
  // Ajuste durante o render (padrão do React pra estado derivado de prop).
  if (rolo.value !== value) setRolo({ value, dir: value > rolo.value ? 1 : -1 });
  const linha = React.useRef<HTMLSpanElement>(null);
  const texto = String(value);
  const largura = useSeguirTamanho(linha, "width", texto, reduzir, MOLA_FORMA);

  return (
    <motion.span className="inline-flex min-w-0" style={{ width: largura }} aria-hidden="true">
      {/* A medida mora neste span interno: filho direto do popLayout não leva ref. */}
      <span ref={linha} className="relative inline-flex w-max">
        <AnimatePresence mode="popLayout" initial={false} custom={rolo.dir}>
          {[...texto].map((d, i) => (
            <motion.span
              // A chave conta da direita: a unidade é sempre a mesma casa.
              key={`${texto.length - i}:${d}`}
              className="inline-block"
              custom={rolo.dir}
              variants={reduzir ? digitoParado : digitoVai}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduzir ? { duration: 0 } : digitoTransicao}
            >
              {d}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </motion.span>
  );
}

const CHUTE = { type: "spring", stiffness: 420, damping: 17 } as const;

function IconeChute({ icon: Icone, pulso, reduzir }: { icon: LucideIcon; pulso: number; reduzir: boolean }) {
  const escala = useMotionValue(1);
  const giro = useMotionValue(0);
  const visto = React.useRef(0);

  React.useEffect(() => {
    if (pulso <= visto.current) return;
    visto.current = pulso;
    if (reduzir) return;
    // Soma a velocidade que já existe: toque duplo empurra mais, não recomeça.
    animate(escala, 1, { ...CHUTE, velocity: escala.getVelocity() + 11 });
    animate(giro, 0, { ...CHUTE, velocity: giro.getVelocity() - 420 });
  }, [pulso, reduzir, escala, giro]);
  React.useEffect(
    () => () => {
      escala.stop();
      giro.stop();
    },
    [escala, giro],
  );

  return (
    <motion.span className="grid size-4 flex-none place-items-center" style={{ scale: escala, rotate: giro }} aria-hidden="true">
      <Icone size={16} strokeWidth={1.75} />
    </motion.span>
  );
}

const repouso: TargetAndTransition = { opacity: 1, scale: 1, y: 0, filter: borrar(0) };
const soOpacidade: TargetAndTransition = { opacity: 0 };
const someSeco: TargetAndTransition = { opacity: 0, transition: { duration: 0.12 } };
const pilulaEntra: TargetAndTransition = { opacity: 0, scale: 0.5, filter: borrar(4) };
const pilulaSai: TargetAndTransition = {
  opacity: 0,
  scale: 0.6,
  filter: borrar(2),
  transition: { duration: RAPIDO, ease: SAIDA },
};
const pilulaTransicao = {
  layout: MOLA_FORMA,
  scale: MOLA_TOQUE,
  opacity: { duration: RAPIDO, ease: SAIDA },
  filter: { duration: RAPIDO, ease: SAIDA },
};
const iconeEntra: TargetAndTransition = { opacity: 0, scale: 0.6, filter: borrar(2) };
const iconeSai: TargetAndTransition = { ...iconeEntra, transition: { duration: RAPIDO, ease: SAIDA } };
const iconeTransicao = {
  ...MOLA_TOQUE,
  opacity: { duration: RAPIDO, ease: SAIDA },
  filter: { duration: RAPIDO, ease: SAIDA },
};
const textoEntra: TargetAndTransition = { opacity: 0, y: "0.3em", filter: borrar(4) };
const textoSai: TargetAndTransition = {
  opacity: 0,
  y: "-0.3em",
  filter: borrar(2),
  transition: { duration: RAPIDO, ease: SAIDA },
};

const foco = "focus-visible:outline-none focus-visible:[box-shadow:var(--focus)]";
const transicaoCor =
  "[transition:background-color_var(--dur-fast)_var(--ease-out),border-color_var(--dur-fast)_var(--ease-out),color_var(--dur-fast)_var(--ease-out)]";
const dica =
  "pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 -translate-x-1/2 translate-y-[3px] whitespace-nowrap rounded-[var(--r-pill)] border border-border bg-card px-2 py-1 text-apoio font-normal leading-tight text-foreground opacity-0 [box-shadow:var(--e-raised)] [transition:opacity_var(--dur-press)_var(--ease-out),translate_var(--dur-fast)_var(--ease-out)]";
// A dica entra depois de uma pausa no hover (não pisca ao varrer a barra) e
// mais rápido no foco de teclado.
const dicaAparece =
  "group-hover/pilula:translate-y-0 group-hover/pilula:opacity-100 group-hover/pilula:delay-[450ms] group-focus-visible/pilula:translate-y-0 group-focus-visible/pilula:opacity-100 group-focus-visible/pilula:delay-200";

/** A bandeja: um realce compartilhado desliza até a opção em hover ou foco. */
function Bandeja({
  options,
  minhas,
  reduzir,
  onPick,
}: {
  options: ReactionOption[];
  minhas: Set<string>;
  reduzir: boolean;
  onPick: (id: string) => void;
}) {
  const [focoIdx, setFocoIdx] = React.useState(0);
  const [hover, setHover] = React.useState<number | null>(null);
  const ativo = Math.min(hover ?? focoIdx, options.length - 1);
  const botoes = React.useRef<(HTMLButtonElement | null)[]>([]);
  const x = useMotionValue(0);
  const posto = React.useRef(false);

  React.useLayoutEffect(() => {
    // offsetLeft é medida local: não sofre com o palco escalado.
    const alvo = botoes.current[ativo]?.offsetLeft ?? 0;
    if (!posto.current || reduzir) {
      posto.current = true;
      x.jump(alvo);
      return;
    }
    // Alvo novo redireciona a mola em voo e mantém a velocidade: varrer rápido
    // desliza em vez de pular de casa em casa.
    animate(x, alvo, MOLA_FORMA);
  }, [ativo, reduzir, x]);
  React.useEffect(() => () => x.stop(), [x]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const passos: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const n = options.length;
    const prox =
      e.key in passos
        ? (focoIdx + passos[e.key]! + n) % n
        : e.key === "Home"
          ? 0
          : e.key === "End"
            ? n - 1
            : -1;
    if (prox < 0) return;
    e.preventDefault();
    setHover(null);
    setFocoIdx(prox);
    botoes.current[prox]?.focus();
  }

  const opcao = options[ativo];
  const escolhida = opcao ? minhas.has(opcao.id) : false;

  return (
    <>
      <div
        className="relative isolate flex gap-0.5"
        role="toolbar"
        aria-label="Reações"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHover(null)}
      >
        <motion.span
          className="absolute left-0 top-0 -z-10 size-10 rounded-[var(--r-pill)] bg-muted"
          style={{ x }}
          aria-hidden="true"
        />
        {options.map((item, i) => {
          const Icone = item.icon;
          const aceso = i === ativo;
          const minha = minhas.has(item.id);
          const atraso = 0.04 + i * 0.035;
          return (
            <motion.button
              key={item.id}
              ref={(no) => {
                botoes.current[i] = no;
              }}
              type="button"
              aria-label={item.label}
              aria-pressed={minha}
              tabIndex={i === focoIdx ? 0 : -1}
              className={cn(
                "relative grid size-10 flex-none cursor-pointer place-items-center rounded-[var(--r-pill)] border-0 p-0 [-webkit-tap-highlight-color:transparent]",
                transicaoCor,
                foco,
                minha
                  ? "bg-[color-mix(in_oklab,var(--brand)_16%,transparent)] text-foreground [box-shadow:inset_0_0_0_1px_var(--brand)] [&_svg]:fill-[color-mix(in_oklab,currentColor_22%,transparent)]"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
              )}
              onFocus={() => setFocoIdx(i)}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse" && hover !== i) setHover(i);
              }}
              onClick={() => onPick(item.id)}
              initial={reduzir ? soOpacidade : iconeEntra}
              animate={repouso}
              transition={
                reduzir
                  ? { duration: RAPIDO }
                  : {
                      ...iconeTransicao,
                      delay: atraso,
                      opacity: { ...iconeTransicao.opacity, delay: atraso },
                      filter: { ...iconeTransicao.filter, delay: atraso },
                    }
              }
            >
              <motion.span
                className="grid place-items-center"
                animate={{ scale: aceso && !reduzir ? 1.14 : 1, y: aceso && !reduzir ? -1 : 0 }}
                transition={MOLA_TOQUE}
              >
                <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
              </motion.span>
            </motion.button>
          );
        })}
      </div>
      <div className="relative flex h-[22px] items-center justify-center text-apoio leading-none text-muted-foreground" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {opcao && (
            <motion.span
              key={`${opcao.id}:${escolhida}`}
              className="inline-flex items-center gap-1 whitespace-nowrap"
              initial={reduzir ? soOpacidade : textoEntra}
              animate={repouso}
              exit={reduzir ? someSeco : textoSai}
              transition={{ duration: reduzir ? RAPIDO : 0.24, ease: SAIDA }}
            >
              {escolhida && <Check size={12} strokeWidth={2} />}
              {opcao.label}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

const plural = (n: number) => (n === 1 ? "reação" : "reações");

export function Reactions({
  options,
  value,
  defaultValue = [],
  onValueChange,
  label = "Reações",
  className,
}: ReactionsProps) {
  const reduzir = useReduzir();
  const grupo = React.useId();
  const [propria, setPropria] = React.useState(defaultValue);
  const lista = value ?? propria;
  const [pulsos, setPulsos] = React.useState<Record<string, number>>({});
  const [aviso, setAviso] = React.useState("");
  const [aberto, setAberto] = React.useState(false);
  const barra = React.useRef<HTMLDivElement>(null);
  const gatilho = React.useRef<HTMLButtonElement>(null);
  const refocar = React.useRef<string | null>(null);

  const porId = new Map(options.map((o) => [o.id, o]));
  const visiveis = lista.filter((r) => r.count > 0 && porId.has(r.id));
  const minhas = new Set(visiveis.filter((r) => r.reacted).map((r) => r.id));
  const altura = useSeguirTamanho(
    barra,
    "height",
    visiveis.map((r) => `${r.id}${r.count}`).join(),
    reduzir,
    MOLA_LISA,
  );

  // Pílula que saiu com o foco entrega o foco à vizinha (ver nota 3).
  React.useLayoutEffect(() => {
    const alvo = refocar.current;
    if (!alvo) return;
    refocar.current = null;
    const prox =
      alvo === "add"
        ? gatilho.current
        : barra.current?.querySelector<HTMLElement>(`[data-reaction="${CSS.escape(alvo)}"]`);
    prox?.focus();
  });

  function alternar(id: string) {
    const opcao = porId.get(id);
    if (!opcao) return;
    const atual = visiveis.find((r) => r.id === id);
    const somar = !atual?.reacted;
    const n = Math.max(0, (atual?.count ?? 0) + (somar ? 1 : -1));
    // O próximo sai da lista desenhada, nunca de dentro de um updater: o
    // callback do pai roda uma vez só, com o valor certo.
    const prox = atual
      ? lista.map((r) => (r.id === id ? { ...r, count: n, reacted: somar } : r)).filter((r) => r.count > 0)
      : [...lista.filter((r) => r.id !== id), { id, count: 1, reacted: true }];

    if (n === 0) {
      const pilula = barra.current?.querySelector(`[data-reaction="${CSS.escape(id)}"]`);
      if (pilula && pilula === document.activeElement) {
        const i = visiveis.findIndex((r) => r.id === id);
        refocar.current = visiveis[i + 1]?.id ?? visiveis[i - 1]?.id ?? "add";
      }
    }
    if (somar) setPulsos((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
    if (value === undefined) setPropria(prox);
    setAviso(
      somar
        ? `Você reagiu com ${opcao.label}. ${n} ${plural(n)}.`
        : n
          ? `Você tirou ${opcao.label}. ${n} ${plural(n)}.`
          : `Você tirou ${opcao.label}.`,
    );
    onValueChange?.(prox, { id, reacted: somar });
  }

  function escolher(id: string) {
    setAberto(false);
    gatilho.current?.focus();
    alternar(id);
  }

  return (
    <motion.div className={cn("relative min-w-0", className)} style={{ height: altura }}>
      <div ref={barra} className="relative flex flex-wrap items-center gap-x-1.5 gap-y-2" role="group" aria-label={label}>
        <LayoutGroup id={grupo}>
          <AnimatePresence mode="popLayout" initial={false}>
            {visiveis.map((r) => {
              const opcao = porId.get(r.id)!;
              return (
                <motion.button
                  key={r.id}
                  layout="position"
                  type="button"
                  data-reaction={r.id}
                  aria-pressed={r.reacted}
                  aria-label={`${opcao.label}, ${r.count} ${plural(r.count)}${r.reacted ? ", incluindo a sua" : ""}`}
                  onClick={() => alternar(r.id)}
                  className={cn(
                    "group/pilula relative inline-flex h-8 flex-none cursor-pointer items-center gap-1.5 rounded-[var(--r-pill)] border py-0 pl-2.5 pr-3 text-corpo font-medium leading-none tabular-nums [-webkit-tap-highlight-color:transparent] [touch-action:manipulation] hover:z-10 focus-visible:z-10",
                    transicaoCor,
                    foco,
                    r.reacted
                      ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--brand)_14%,var(--card))] text-foreground hover:bg-[color-mix(in_oklab,var(--brand)_22%,var(--card))] [&_svg]:fill-[color-mix(in_oklab,currentColor_22%,transparent)]"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  initial={reduzir ? soOpacidade : pilulaEntra}
                  animate={repouso}
                  exit={reduzir ? someSeco : pilulaSai}
                  whileTap={{ scale: reduzir ? 1 : 0.97 }}
                  transition={reduzir ? { duration: RAPIDO, layout: { duration: 0 } } : pilulaTransicao}
                >
                  <IconeChute icon={opcao.icon} pulso={pulsos[r.id] ?? 0} reduzir={reduzir} />
                  <Contagem value={r.count} reduzir={reduzir} />
                  <span className={cn(dica, dicaAparece)} aria-hidden="true">
                    {opcao.label}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>

          <Popover.Root open={aberto} onOpenChange={setAberto}>
            {/* O botão é a âncora da bandeja: responde ao toque com cor, nunca com escala. */}
            <Popover.Trigger asChild>
              <motion.button
                ref={gatilho}
                layout="position"
                transition={reduzir ? { layout: { duration: 0 } } : { layout: MOLA_FORMA }}
                type="button"
                aria-label="Adicionar reação"
                className={cn(
                  "group/pilula relative inline-flex h-8 w-[38px] flex-none cursor-pointer items-center justify-center rounded-[var(--r-pill)] border border-border bg-card p-0 text-muted-foreground [-webkit-tap-highlight-color:transparent] hover:z-10 hover:bg-muted hover:text-foreground focus-visible:z-10 data-[state=open]:bg-muted data-[state=open]:text-foreground",
                  transicaoCor,
                  foco,
                )}
              >
                <span className="grid size-4 place-items-center" aria-hidden="true">
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={aberto ? "fechar" : "abrir"}
                      className="[grid-area:1/1] grid place-items-center"
                      initial={reduzir ? soOpacidade : iconeEntra}
                      animate={repouso}
                      exit={reduzir ? someSeco : iconeSai}
                      transition={reduzir ? { duration: RAPIDO } : iconeTransicao}
                    >
                      {aberto ? <X size={16} strokeWidth={1.75} /> : <SmilePlus size={16} strokeWidth={1.75} />}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {!aberto && (
                  <span className={cn(dica, dicaAparece)} aria-hidden="true">
                    Adicionar reação
                  </span>
                )}
              </motion.button>
            </Popover.Trigger>
            <AnimatePresence>
              {aberto && (
                <Popover.Portal forceMount>
                  {/* O foco volta à mão: na hora depois de escolher ou Esc, e nunca quando se clica fora. */}
                  <Popover.Content
                    forceMount
                    asChild
                    side="top"
                    align="center"
                    sideOffset={8}
                    collisionPadding={12}
                    aria-label="Escolher reação"
                    onEscapeKeyDown={() => gatilho.current?.focus()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <motion.div
                      className="z-[60] grid origin-[var(--radix-popover-content-transform-origin)] gap-0.5 rounded-[var(--r-surface)] border border-border bg-card p-1 text-foreground outline-none [box-shadow:var(--e-raised)] data-[state=closed]:pointer-events-none"
                      initial={reduzir ? soOpacidade : { opacity: 0, scale: 0.5, filter: borrar(4) }}
                      animate={repouso}
                      exit={
                        reduzir
                          ? someSeco
                          : { opacity: 0, scale: 0.9, filter: borrar(2), transition: { duration: RAPIDO, ease: SAIDA } }
                      }
                      transition={
                        reduzir
                          ? { duration: RAPIDO }
                          : {
                              scale: MOLA_TOQUE,
                              opacity: { duration: RAPIDO, ease: SAIDA },
                              filter: { duration: RAPIDO, ease: SAIDA },
                            }
                      }
                    >
                      {/* Seta invisível: com ela o Radix põe a origem da escala no centro
                          do botão, e a bandeja nasce dele mesmo quando desvia da borda. */}
                      <Popover.Arrow width={0} height={0} className="invisible" />
                      <Bandeja options={options} minhas={minhas} reduzir={reduzir} onPick={escolher} />
                    </motion.div>
                  </Popover.Content>
                </Popover.Portal>
              )}
            </AnimatePresence>
          </Popover.Root>
        </LayoutGroup>
      </div>
      <span className="sr-only" role="status">
        {aviso}
      </span>
    </motion.div>
  );
}
