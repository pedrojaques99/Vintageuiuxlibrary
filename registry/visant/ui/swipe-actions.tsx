"use client";

// Adaptado de Swipe actions — https://uiarc.dev/components/swipe-actions — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
  type MotionValue,
  type Transition,
} from "motion/react";
import { MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Swipe Actions: a linha que arrasta pro lado e revela o que dá pra fazer.
 *
 * Lista de triagem (caixa de entrada, fila de aprovação, pedidos) pede ação
 * rápida em muitas linhas seguidas. Botão em cada linha vira ruído visual;
 * menu em cada linha vira dois cliques. Arrastar é o gesto que o polegar já
 * conhece do e-mail no celular.
 *
 * ── Decisões que não são óbvias ────────────────────────────────────────────
 *
 * 1. **O gesto nunca é o único caminho.** Toda linha tem o botão "Mais ações"
 *    com as mesmas ações num menu. As camadas reveladas ficam fora da ordem de
 *    Tab e da árvore de acessibilidade: teclado e leitor de tela usam o menu.
 * 2. **A direção trava nos primeiros 8 px.** Se o dedo foi mais pra baixo que
 *    pro lado, a rolagem é da página e a linha nem se mexe. Sem isso, rolar a
 *    lista arrasta linha sem querer.
 * 3. **Passou do fim, vira elástico.** Depois da última parada a linha ainda
 *    segue, mas cada pixel custa mais. Um arrasto longo (mais da metade da
 *    linha) ou um peteleco rápido executam a ação da ponta; a camada dela se
 *    estica pela linha inteira antes, pra avisar que soltar vai valer.
 * 4. **A velocidade de soltar entra na mola.** A linha não para e recomeça: o
 *    peteleco continua no assentamento, e soltar a caminho de casa nunca passa
 *    do zero (senão as ações do outro lado piscam).
 * 5. **Só uma linha aberta por vez.** Tocar fora ou Esc fecha; tocar numa
 *    linha aberta fecha em vez de clicar no que está embaixo.
 *
 * Quem remove o item é você, no `onSelect`: a linha sai pelo lado e a lista
 * fecha o vão. Se o item ficar (`keepRow`), ela volta pra casa.
 */

export interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  /** Cor da camada. `danger` pede um rótulo que diga o que some. */
  tone?: "neutral" | "brand" | "danger";
  /** Roda no arrasto longo, no toque na camada ou no menu. Remova o item aqui, a menos que `keepRow`. */
  onSelect: () => void;
  /** A linha volta pra casa depois da ação em vez de sair (ex.: marcar como não lida). */
  keepRow?: boolean;
}

export interface SwipeActionsProps {
  /** Nome acessível da lista. */
  label: string;
  children: React.ReactNode;
  className?: string;
}

export interface SwipeActionsRowProps {
  /** Nomeia o botão de menu da linha, ex.: o assunto da mensagem. */
  label: string;
  /** Ações sob a borda esquerda (arrasta pra direita). A primeira executa no arrasto longo. */
  leading?: SwipeAction[];
  /** Ações sob a borda direita (arrasta pra esquerda). A última executa no arrasto longo. */
  trailing?: SwipeAction[];
  /** Deixa o arrasto longo executar a ação da ponta sem toque. */
  fullSwipe?: boolean;
  /**
   * Ao montar, a linha dá uma espiada curta pro lado das ações e volta: ensina
   * o gesto sem texto. Use numa linha só (a primeira), nunca na lista toda.
   */
  peek?: boolean;
  children: React.ReactNode;
  className?: string;
}

type Lado = "leading" | "trailing";
type Grupo = {
  abertaId: string | null;
  setAbertaId: React.Dispatch<React.SetStateAction<string | null>>;
  linhas: Map<string, HTMLElement>;
};
type Arrasto = {
  ponteiro: number;
  tipo: string;
  x0: number;
  y0: number;
  origem: number;
  trava: "x" | "y" | null;
  amostras: [number, number][];
};

/** Largura de uma ação com a linha aberta em repouso. */
const ACAO = 76;
/** Movimento antes de decidir se é arrasto ou rolagem. */
const FOLGA = 8;
/** Segundos de viagem projetados a partir da velocidade de soltar. */
const PROJECAO = 0.1;
/** Velocidade (px/s) que conta como peteleco. */
const PETELECO = 900;

const MOLA_FIRME: Transition = { type: "spring", visualDuration: 0.22, bounce: 0.12 };
const MOLA_LISA: Transition = { type: "spring", visualDuration: 0.3, bounce: 0 };
const MOLA_FORMA: Transition = { type: "spring", visualDuration: 0.26, bounce: 0.15 };

const TOM_CAMADA = {
  neutral: "bg-muted text-foreground",
  brand: "bg-[var(--brand)] text-[var(--brand-foreground)]",
  danger: "bg-destructive text-destructive-foreground",
} as const;

const limitar01 = (v: number) => Math.min(1, Math.max(0, v));
const elastico = (sobra: number, dim: number) => (1 - 1 / ((sobra * 0.55) / dim + 1)) * dim;
const ladoDe = (v: number): Lado | null => (v > 0 ? "leading" : v < 0 ? "trailing" : null);

const GrupoCtx = React.createContext<Grupo>({ abertaId: null, setAbertaId: () => {}, linhas: new Map() });

export function SwipeActions({ label, children, className }: SwipeActionsProps) {
  const [abertaId, setAbertaId] = React.useState<string | null>(null);
  const [linhas] = React.useState(() => new Map<string, HTMLElement>());
  React.useEffect(() => {
    if (!abertaId) return;
    const baixo = (e: PointerEvent) => {
      const l = linhas.get(abertaId);
      if (l && e.target instanceof Node && l.contains(e.target)) return;
      setAbertaId(null);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbertaId(null);
    document.addEventListener("pointerdown", baixo, true);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", baixo, true);
      document.removeEventListener("keydown", tecla);
    };
  }, [abertaId, linhas]);
  const grupo = React.useMemo(() => ({ abertaId, setAbertaId, linhas }), [abertaId, linhas]);
  return (
    <GrupoCtx.Provider value={grupo}>
      <div className={cn("overflow-hidden rounded-[var(--r-surface)] border border-border bg-card", className)}>
        {/* Puxada 1 px pra baixo: o último separador some sob a moldura sem depender de :last-child enquanto linhas saem. */}
        <ul role="list" aria-label={label} tabIndex={-1} className="-mb-px list-none p-0 outline-none">
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </ul>
      </div>
    </GrupoCtx.Provider>
  );
}

function velocidade(amostras: [number, number][]) {
  const ult = amostras[amostras.length - 1];
  if (!ult) return 0;
  const pri = amostras.find((a) => ult[0] - a[0] <= 80) ?? ult;
  const dt = (ult[0] - pri[0]) / 1000;
  return dt > 0 ? (ult[1] - pri[1]) / dt : 0;
}

export function SwipeActionsRow({
  label,
  leading = [],
  trailing = [],
  fullSwipe = true,
  peek = false,
  children,
  className,
}: SwipeActionsRowProps) {
  const { abertaId, setAbertaId, linhas } = React.useContext(GrupoCtx);
  const id = React.useId();
  const reduzido = useReducedMotion() ?? false;
  const presente = useIsPresent();
  const linhaRef = React.useRef<HTMLLIElement>(null);
  const x = useMotionValue(0);
  const cobre = useMotionValue(0);
  const [cobrindo, setCobrindo] = React.useState<{ lado: Lado; i: number } | null>(null);
  const [menuAberto, setMenuAberto] = React.useState(false);
  const largura = React.useRef(0);
  const arrasto = React.useRef<Arrasto | null>(null);
  const viagem = React.useRef<AnimationPlaybackControls | null>(null);
  const estica = React.useRef<AnimationPlaybackControls | null>(null);
  const armado = React.useRef(false);
  const saindo = React.useRef(false);
  const engolirClique = React.useRef(false);
  const focarVizinho = React.useRef(false);
  const timerVolta = React.useRef(0);

  const acoes = (l: Lado) => (l === "leading" ? leading : trailing);
  const larguraAberta = (l: Lado) => acoes(l).length * ACAO;
  const ponta = (l: Lado) => (l === "leading" ? 0 : trailing.length - 1);
  const executaInteira = (l: Lado) => fullSwipe && acoes(l).length > 0;
  const limiar = (l: Lado) => Math.max(larguraAberta(l) + 48, largura.current * 0.56);

  function esticarAte(v: number) {
    estica.current?.stop();
    if (reduzido) return cobre.jump(v);
    estica.current = animate(cobre, v, MOLA_FORMA);
  }

  /** Leva a linha a uma parada carregando a velocidade de soltar. */
  function assentar(alvo: number, vel = 0) {
    if (armado.current || (alvo !== 0 && cobre.get() !== 0)) esticarAte(0);
    armado.current = false;
    const de = x.get();
    const emCasa = () => {
      if (alvo === 0) {
        estica.current?.stop();
        cobre.jump(0);
      }
    };
    if (reduzido) {
      x.jump(alvo);
      emCasa();
    } else {
      // Indo pra casa, a mola não pode passar do zero, senão as ações do outro lado piscam.
      const rumoCasa = alvo === 0 && Math.sign(vel) === -Math.sign(de);
      const impulso = rumoCasa ? Math.sign(vel) * Math.min(Math.abs(vel), Math.abs(de) * 12) : vel;
      viagem.current = animate(x, alvo, { ...(alvo === 0 ? MOLA_LISA : MOLA_FIRME), velocity: impulso, onComplete: emCasa });
    }
    if (alvo === 0) setAbertaId((c) => (c === id ? null : c));
    else setAbertaId(id);
  }

  /** A ação escolhida se estica pela linha enquanto a linha sai na direção dela; depois a lista fecha o vão. */
  function executar(l: Lado, i: number, vel = 0) {
    const acao = acoes(l)[i];
    if (!acao || saindo.current) return;
    const dir = l === "leading" ? 1 : -1;
    armado.current = false;
    setCobrindo({ lado: l, i });
    esticarAte(1);
    if (acao.keepRow) {
      acao.onSelect();
      assentar(0, vel);
      return;
    }
    saindo.current = true;
    const linha = linhaRef.current;
    if (linha) linha.dataset.removing = "";
    viagem.current?.stop();
    const fim = dir * (largura.current + 2);
    if (reduzido) x.jump(fim);
    else viagem.current = animate(x, fim, { ...MOLA_LISA, velocity: Math.sign(vel) === dir ? vel : 0 });
    setAbertaId((c) => (c === id ? null : c));
    acao.onSelect();
    // Se a lista decidiu manter o item, a linha volta em vez de deixar uma faixa de cor vazia.
    window.clearTimeout(timerVolta.current);
    timerVolta.current = window.setTimeout(() => {
      if (!saindo.current) return;
      saindo.current = false;
      if (linha) delete linha.dataset.removing;
      assentar(0);
    }, 1400);
  }

  function armar(v: number, tipo: string) {
    const l = ladoDe(v);
    const lim = l ? limiar(l) : Infinity;
    // Histerese de 20 px: na beira do limiar a camada não fica piscando entre armada e não.
    const prox = !!l && executaInteira(l) && Math.abs(v) > (armado.current ? lim - 20 : lim);
    if (prox === armado.current || !l) {
      if (!l && armado.current) {
        armado.current = false;
        esticarAte(0);
      }
      return;
    }
    armado.current = prox;
    if (prox) {
      setCobrindo({ lado: l, i: ponta(l) });
      if (tipo === "touch") navigator.vibrate?.(8);
    }
    esticarAte(prox ? 1 : 0);
  }

  function conter(bruto: number) {
    const l = ladoDe(bruto);
    if (!l) return 0;
    const dim = largura.current || 320;
    const lim = acoes(l).length === 0 ? 0 : executaInteira(l) ? dim : larguraAberta(l);
    const d = Math.abs(bruto);
    return Math.sign(bruto) * (d <= lim ? d : lim + elastico(d - lim, dim));
  }

  function soltar(vel: number) {
    const v = x.get();
    const l = ladoDe(v);
    if (!l || acoes(l).length === 0) return assentar(0, vel);
    const dir = l === "leading" ? 1 : -1;
    const d = Math.abs(v);
    const pra_fora = vel * dir;
    const aberta = larguraAberta(l);
    const projetado = d + pra_fora * PROJECAO;
    const atirou = d > aberta && pra_fora > PETELECO && projetado > limiar(l);
    // Um peteleco de volta pra casa desarma o arrasto longo.
    if (executaInteira(l) && ((armado.current && pra_fora > -PETELECO) || atirou)) return executar(l, ponta(l), vel);
    assentar(projetado > aberta / 2 ? dir * aberta : 0, vel);
  }

  function aoBaixar(e: React.PointerEvent<HTMLDivElement>) {
    engolirClique.current = false;
    if (saindo.current || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    // Pega a linha no meio do voo: o próximo movimento parte de onde ela está.
    viagem.current?.stop();
    arrasto.current = {
      ponteiro: e.pointerId,
      tipo: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      origem: x.get(),
      trava: null,
      amostras: [[e.timeStamp, e.clientX]],
    };
  }

  function aoMover(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrasto.current;
    if (!a || a.ponteiro !== e.pointerId || a.trava === "y") return;
    if (!a.trava) {
      const dx = e.clientX - a.x0;
      const dy = e.clientY - a.y0;
      if (Math.hypot(dx, dy) < FOLGA) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        a.trava = "y";
        return;
      }
      // Mede a partir daqui, pra vencer a folga não dar salto na linha.
      a.trava = "x";
      a.x0 = e.clientX;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (linhaRef.current) linhaRef.current.dataset.dragging = "";
      setAbertaId(id);
    }
    const v = conter(a.origem + e.clientX - a.x0);
    x.set(v);
    a.amostras.push([e.timeStamp, e.clientX]);
    if (a.amostras.length > 12) a.amostras.shift();
    armar(v, a.tipo);
  }

  function aoSoltar(e: React.PointerEvent<HTMLDivElement>) {
    const a = arrasto.current;
    if (!a || a.ponteiro !== e.pointerId) return;
    arrasto.current = null;
    if (a.trava === "x") {
      engolirClique.current = true;
      if (linhaRef.current) delete linhaRef.current.dataset.dragging;
      a.amostras.push([e.timeStamp, e.clientX]);
      soltar(e.type === "pointercancel" ? 0 : velocidade(a.amostras));
      return;
    }
    // Toque numa linha aberta fecha a linha em vez de agir no que está embaixo.
    if (a.trava === null && Math.abs(x.get()) > 0.5) {
      engolirClique.current = true;
      assentar(0);
    }
  }

  function moverFocoProVizinho() {
    const linha = linhaRef.current;
    if (!linha) return;
    const quemFica = (passo: "nextElementSibling" | "previousElementSibling") => {
      let n = linha[passo];
      while (n instanceof HTMLElement && "removing" in n.dataset) n = n[passo];
      return n;
    };
    const viz = quemFica("nextElementSibling") ?? quemFica("previousElementSibling");
    (viz?.querySelector<HTMLElement>("[data-swipe-more]") ?? linha.parentElement)?.focus({ preventScroll: true });
  }

  React.useEffect(() => {
    const linha = linhaRef.current;
    if (!linha) return;
    linhas.set(id, linha);
    largura.current = linha.offsetWidth;
    const obs = new ResizeObserver(([e]) => {
      if (e) largura.current = e.contentRect.width;
    });
    obs.observe(linha);
    return () => {
      obs.disconnect();
      linhas.delete(id);
      window.clearTimeout(timerVolta.current);
      setAbertaId((c) => (c === id ? null : c));
    };
  }, [id, linhas, setAbertaId]);

  // A espiada: uma vez, depois de a linha assentar na tela, e só se ninguém
  // já pegou nela. Vai pro lado que tem ação e volta sem passar do zero.
  React.useEffect(() => {
    if (!peek || reduzido) return;
    const dir = trailing.length ? -1 : leading.length ? 1 : 0;
    if (!dir) return;
    let vivo = true;
    const t = window.setTimeout(async () => {
      if (arrasto.current || x.get() !== 0) return;
      viagem.current = animate(x, dir * 44, MOLA_FIRME);
      await viagem.current;
      if (!vivo || arrasto.current || saindo.current) return;
      viagem.current = animate(x, 0, MOLA_LISA);
    }, 700);
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peek, reduzido]);

  // Outra linha abriu, ou tocaram fora: esta se recolhe. (Ref pro handler mais novo, sem refazer o efeito.)
  const fecharPorOutra = React.useRef(() => {});
  fecharPorOutra.current = () => {
    if (abertaId !== id && !saindo.current && arrasto.current?.trava !== "x" && x.get() !== 0) assentar(0);
  };
  React.useEffect(() => fecharPorOutra.current(), [abertaId]);

  // Um desfazer devolveu o item enquanto ele ainda saía: a linha volta pra casa enquanto a altura reabre.
  const voltarPraCasa = React.useRef(() => {});
  voltarPraCasa.current = () => {
    if (!saindo.current) return;
    saindo.current = false;
    window.clearTimeout(timerVolta.current);
    if (linhaRef.current) delete linhaRef.current.dataset.removing;
    assentar(0);
  };
  React.useEffect(() => {
    if (presente) voltarPraCasa.current();
  }, [presente]);

  const itensMenu = [
    ...leading.map((acao, i) => ({ acao, lado: "leading" as const, i })),
    ...trailing.map((acao, i) => ({ acao, lado: "trailing" as const, i })),
  ];
  const recolher = reduzido
    ? { opacity: 0, transition: { duration: 0.15 } }
    : { height: 0, opacity: 0, transition: { height: { ...MOLA_LISA, delay: 0.12 }, opacity: { duration: 0.1, delay: 0.34 } } };

  return (
    <motion.li
      ref={linhaRef}
      className={cn("group/linha relative isolate overflow-hidden", className)}
      initial={reduzido ? { opacity: 0 } : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={recolher}
      transition={reduzido ? { duration: 0.15 } : { height: MOLA_LISA, opacity: { duration: 0.2 } }}
    >
      {(["leading", "trailing"] as const).map((l) =>
        acoes(l).map((acao, i) => {
          const n = acoes(l).length;
          const grau = l === "leading" ? n - 1 - i : i;
          const grauCobre = cobrindo?.lado === l ? (l === "leading" ? n - 1 - cobrindo.i : cobrindo.i) : null;
          return (
            <Camada
              key={`${l}-${i}`}
              acao={acao}
              lado={l}
              grau={grau}
              total={n}
              grauCobre={grauCobre}
              x={x}
              cobre={cobre}
              aoTocar={() => executar(l, i)}
            />
          );
        }),
      )}
      <motion.div
        style={{ x }}
        onPointerDown={aoBaixar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onClickCapture={(e) => {
          if (!engolirClique.current) return;
          engolirClique.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        className={cn(
          "relative z-10 flex min-h-16 select-none items-center gap-2 bg-card py-3 pl-4 pr-2 [-webkit-touch-callout:none] [touch-action:pan-y]",
          "[@media(hover:hover)]:cursor-grab group-data-[dragging]/linha:cursor-grabbing",
          "after:pointer-events-none after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-border after:content-['']",
        )}
      >
        <div className="min-w-0 flex-auto">{children}</div>
        {itensMenu.length > 0 && (
          <Menu.Root open={menuAberto} onOpenChange={setMenuAberto}>
            {/* Abre no clique e não no aperto: um arrasto que começa no botão ainda move a linha. */}
            <Menu.Trigger
              data-swipe-more=""
              aria-label={`Mais ações: ${label}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => {
                if (e.detail > 0) setMenuAberto((o) => !o);
              }}
              className="grid size-8 flex-none place-items-center rounded-[var(--r-control)] text-muted-foreground outline-none transition-colors [transition-duration:var(--dur-fast)] hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)] data-[state=open]:bg-muted data-[state=open]:text-foreground group-data-[dragging]/linha:bg-transparent"
            >
              <MoreHorizontal className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Content
                align="end"
                sideOffset={6}
                collisionPadding={12}
                loop
                onCloseAutoFocus={(e) => {
                  if (!focarVizinho.current) return;
                  focarVizinho.current = false;
                  e.preventDefault();
                  moverFocoProVizinho();
                }}
                className="z-[60] min-w-44 rounded-[var(--r-surface)] border border-border bg-card p-1.5 text-foreground [box-shadow:var(--e-overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:data-[state=open]:zoom-in-100"
              >
                {itensMenu.map(({ acao, lado, i }) => (
                  <Menu.Item
                    key={`${lado}-${i}`}
                    onSelect={() => {
                      focarVizinho.current = !acao.keepRow;
                      executar(lado, i);
                    }}
                    className={cn(
                      "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[var(--r-control)] px-3 text-sm outline-none data-[highlighted]:bg-muted",
                      acao.tone === "danger" && "text-destructive",
                    )}
                  >
                    <span aria-hidden="true" className="inline-flex w-4 [&_svg]:size-4">
                      {acao.icon}
                    </span>
                    {acao.label}
                  </Menu.Item>
                ))}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        )}
      </motion.div>
    </motion.li>
  );
}

type CamadaProps = {
  acao: SwipeAction;
  lado: Lado;
  grau: number;
  total: number;
  grauCobre: number | null;
  x: MotionValue<number>;
  cobre: MotionValue<number>;
  aoTocar: () => void;
};

/**
 * Uma ação revelada. Grau 0 encosta no conteúdo; o maior grau fica na borda de
 * fora. Toda camada ocupa a linha inteira e entra só por transform: as ações
 * dividem o espaço revelado por igual, alargam juntas e a que executa consegue
 * se esticar pela linha toda.
 */
function Camada({ acao, lado, grau, total, grauCobre, x, cobre, aoTocar }: CamadaProps) {
  const dir = lado === "leading" ? 1 : -1;
  const fatia = useTransform(x, (v) => Math.max(0, v * dir) / total);
  const recuo = useTransform([x, cobre], ([v = 0, p = 0]: number[]) => {
    const revelado = Math.max(0, v * dir);
    const base = ((total - grau) * revelado) / total;
    if (grauCobre === grau) return base + p * (revelado - base);
    if (grauCobre !== null && grau > grauCobre) return base * (1 - p);
    return base;
  });
  const desloca = useTransform(recuo, (v) => dir * v);
  // O glifo vai no centro da sua fatia; quando esta ação cobre a linha, ele encosta no conteúdo.
  const glifoX = useTransform([fatia, cobre], ([f = 0, p = 0]: number[]) =>
    -dir * (grauCobre === grau ? f / 2 + p * (ACAO / 2 - f / 2) : f / 2),
  );
  const revelaIcone = useTransform([fatia, cobre], ([f = 0, p = 0]: number[]) => {
    const proprio = limitar01((f - ACAO * 0.25) / (ACAO * 0.55));
    if (grauCobre === grau) return Math.max(proprio, p);
    return grauCobre === null ? proprio : proprio * (1 - p);
  });
  const revelaRotulo = useTransform([fatia, cobre], ([f = 0, p = 0]: number[]) => {
    const proprio = limitar01((f - ACAO * 0.72) / (ACAO * 0.24));
    if (grauCobre === grau) return Math.max(proprio, p);
    return grauCobre === null ? proprio : proprio * (1 - p);
  });
  const escalaIcone = useTransform(revelaIcone, (v) => 0.6 + 0.4 * v);

  return (
    <motion.button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={aoTocar}
      style={{ x: desloca, zIndex: grau + 1 }}
      className={cn(
        "absolute inset-y-0 w-full cursor-pointer border-0 p-0 outline-none",
        lado === "trailing" ? "left-full" : "right-full",
        TOM_CAMADA[acao.tone ?? "neutral"],
      )}
    >
      <motion.span className={cn("absolute inset-y-0 w-0", lado === "trailing" ? "left-0" : "right-0")} style={{ x: glifoX }}>
        <span className="absolute inset-y-0 -left-[38px] flex w-[76px] flex-col items-center justify-center gap-[3px]">
          <motion.span className="grid place-items-center [&_svg]:size-5" style={{ opacity: revelaIcone, scale: escalaIcone }}>
            {acao.icon}
          </motion.span>
          <motion.span className="whitespace-nowrap text-xs font-medium" style={{ opacity: revelaRotulo }}>
            {acao.label}
          </motion.span>
        </span>
      </motion.span>
    </motion.button>
  );
}

export default SwipeActions;
