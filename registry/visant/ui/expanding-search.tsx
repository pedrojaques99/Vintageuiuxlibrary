"use client";

/*
 * Adaptado de Expanding Search — https://uiarc.dev/components/expanding-search — Copyright (c) 2026 Elia Kuratli, licença MIT (texto integral em ATTRIBUTIONS.md do @visant/ui).
 */

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Expanding Search, a busca que espera como ícone até ser chamada.
 *
 * Em cabeçalho e barra de ferramentas, um campo de busca inteiro disputa
 * espaço com tudo o que é mais usado que ele. Aqui ele fica guardado num
 * botão de lupa e só ocupa a largura quando alguém vai mesmo buscar. A lupa
 * não some: ela é a mesma no botão e no campo, parada na borda de ancoragem,
 * e o campo cresce pra longe dela. É isso que faz ler como um objeto que abre,
 * e não como um botão trocado por um input.
 *
 * Decisões que não se veem de primeira:
 *
 * 1. **A largura anima, não a escala.** O texto digitado não pode achatar no
 *    meio do caminho. O teto é `expandedWidth`, mas nunca passa do container:
 *    num telefone, o campo enche a faixa e para.
 * 2. **Fechar é fácil de três jeitos.** Esc, escolher um resultado ou tirar o
 *    foco de dentro do componente dobram o campo de volta no ícone, e o foco
 *    volta pro botão (no Esc e na escolha), pra quem usa teclado não cair no
 *    começo da página.
 * 3. **O foco fica no campo.** Os resultados são apontados por
 *    `aria-activedescendant`: setas andam com volta nas pontas, Enter escolhe.
 *    A contagem de resultados é anunciada num `aria-live` educado.
 * 4. **A busca ignora acento e caixa.** "acao" acha "Ação". Num catálogo em
 *    português, busca que exige acento é busca que falha calada.
 *
 * Filtra em memória. Pra base grande, passe os itens já filtrados pelo
 * servidor e deixe o componente só ordenar e mostrar.
 */

export interface ExpandingSearchItem {
  id: string;
  title: string;
  /** Uma linha curta embaixo do título: tipo, dono, data. */
  meta?: string;
  /** Palavras extras que também acham o item. */
  keywords?: string[];
}

export interface ExpandingSearchProps {
  /** Dá nome ao botão, ao campo e à lista, como "Buscar projetos". */
  label: string;
  items: ExpandingSearchItem[];
  /** Mostrados antes de digitar, como buscas recentes. */
  suggestions?: ExpandingSearchItem[];
  /** Título dos sugeridos. */
  suggestionsLabel?: string;
  placeholder?: string;
  onSelect?: (item: ExpandingSearchItem) => void;
  onExpandedChange?: (expanded: boolean) => void;
  /** Largura máxima do campo aberto, em px. Nunca passa do container. */
  expandedWidth?: number;
  /** Quantos resultados no máximo. */
  maxResults?: number;
  /** A borda onde o botão mora; o campo cresce pra longe dela. */
  anchor?: "start" | "end";
  className?: string;
}

const LADO = 40;
const MOLA = { type: "spring" as const, visualDuration: 0.3, bounce: 0.1 };

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

/** Começo do título vence começo de palavra, que vence meio de palavra, que vence palavra-chave. */
function ordenar(itens: ExpandingSearchItem[], busca: string, limite: number) {
  const q = normalizar(busca);
  const pontuados: { item: ExpandingSearchItem; nota: number; ordem: number }[] = [];
  itens.forEach((item, ordem) => {
    const titulo = normalizar(item.title);
    const em = titulo.indexOf(q);
    const extra = [item.meta ?? "", ...(item.keywords ?? [])].some((p) => normalizar(p).includes(q));
    const nota = em === 0 ? 0 : em > 0 && /[\s\-/]/.test(titulo[em - 1]!) ? 1 : em > 0 ? 2 : extra ? 3 : -1;
    if (nota >= 0) pontuados.push({ item, nota, ordem });
  });
  return pontuados
    .sort((a, b) => a.nota - b.nota || a.ordem - b.ordem)
    .slice(0, limite)
    .map((p) => p.item);
}

export function ExpandingSearch({
  label,
  items,
  suggestions = [],
  suggestionsLabel = "Recentes",
  placeholder,
  onSelect,
  onExpandedChange,
  expandedWidth = 320,
  maxResults = 6,
  anchor = "end",
  className,
}: ExpandingSearchProps) {
  const reduzido = !!useReducedMotion();
  const id = React.useId();
  const listaId = `${id}-lista`;
  const [aberto, setAberto] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [ativo, setAtivo] = React.useState(-1);
  const raizRef = React.useRef<HTMLDivElement>(null);
  const campoRef = React.useRef<HTMLInputElement>(null);
  const botaoRef = React.useRef<HTMLButtonElement>(null);
  const [teto, setTeto] = React.useState(expandedWidth);

  // O teto é o menor entre `expandedWidth` e a largura do container, e acompanha o container.
  React.useLayoutEffect(() => {
    const no = raizRef.current;
    if (!no) return;
    const medir = () => setTeto(Math.max(LADO, Math.min(expandedWidth, no.clientWidth || expandedWidth)));
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver(medir);
    obs.observe(no);
    return () => obs.disconnect();
  }, [expandedWidth]);

  const digitado = busca.trim();
  const lista = digitado ? ordenar(items, digitado, maxResults) : suggestions.slice(0, maxResults);
  const vazio = digitado !== "" && lista.length === 0;

  const mudarAberto = (v: boolean) => {
    setAberto(v);
    onExpandedChange?.(v);
    if (!v) {
      setBusca("");
      setAtivo(-1);
    }
  };

  // Abriu: o foco vai pro campo depois que ele existe.
  React.useEffect(() => {
    if (aberto) campoRef.current?.focus();
  }, [aberto]);

  const fechar = (devolverFoco: boolean) => {
    mudarAberto(false);
    if (devolverFoco) requestAnimationFrame(() => botaoRef.current?.focus());
  };

  const escolher = (item: ExpandingSearchItem) => {
    onSelect?.(item);
    fechar(true);
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = lista.length;
    if (e.key === "Escape") {
      e.preventDefault();
      fechar(true);
    } else if (e.key === "ArrowDown" && n) {
      e.preventDefault();
      setAtivo((a) => (a + 1) % n);
    } else if (e.key === "ArrowUp" && n) {
      e.preventDefault();
      setAtivo((a) => (a <= 0 ? n - 1 : a - 1));
    } else if (e.key === "Enter" && ativo >= 0 && lista[ativo]) {
      e.preventDefault();
      escolher(lista[ativo]!);
    }
  };

  const fim = anchor === "end";
  const transicao = reduzido ? { duration: 0 } : MOLA;
  const mostraLista = aberto && (lista.length > 0 || vazio);

  return (
    <div
      ref={raizRef}
      className={cn("flex w-full text-sm", fim ? "justify-end" : "justify-start", className)}
      onBlur={(e) => {
        // Foco saiu do componente inteiro: dobra. Foco andando dentro dele não conta.
        if (aberto && !e.currentTarget.contains(e.relatedTarget as Node | null)) fechar(false);
      }}
    >
      <motion.div
        initial={false}
        animate={{ width: aberto ? teto : LADO }}
        transition={transicao}
        className="relative h-10 shrink-0"
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-[var(--r-control)] border border-border bg-card text-foreground",
            "transition-[box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]",
            "has-[:focus-visible]:[box-shadow:var(--focus)]",
          )}
        >
          {/* A lupa: o mesmo ícone no botão e no campo, parado na borda de ancoragem. */}
          <Search
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
              fim ? "right-[11px]" : "left-[11px]",
            )}
          />

          {!aberto && (
            <button
              ref={botaoRef}
              type="button"
              aria-label={label}
              aria-expanded={false}
              onClick={() => mudarAberto(true)}
              className="absolute inset-0 cursor-pointer outline-none"
            />
          )}

          {aberto && (
            <input
              ref={campoRef}
              type="search"
              role="combobox"
              aria-label={label}
              aria-expanded={mostraLista}
              aria-controls={listaId}
              aria-autocomplete="list"
              aria-activedescendant={ativo >= 0 ? `${id}-r-${ativo}` : undefined}
              value={busca}
              placeholder={placeholder ?? label}
              onChange={(e) => {
                setBusca(e.target.value);
                setAtivo(e.target.value.trim() ? 0 : -1);
              }}
              onKeyDown={aoTeclar}
              className={cn(
                "h-full w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground",
                "[&::-webkit-search-cancel-button]:appearance-none",
                "px-9",
              )}
            />
          )}

          {/* Limpar fica do lado oposto à lupa, e só existe com texto. */}
          {aberto && busca && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => {
                setBusca("");
                setAtivo(-1);
                campoRef.current?.focus();
              }}
              className={cn(
                "absolute top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-[var(--r-control)] text-muted-foreground",
                "outline-none hover:bg-muted hover:text-foreground focus-visible:[box-shadow:var(--focus)]",
                fim ? "left-1.5" : "right-1.5",
              )}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {mostraLista && (
            <motion.div
              key="painel"
              initial={reduzido ? { opacity: 0 } : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={reduzido ? { duration: 0.12 } : { type: "spring", visualDuration: 0.22, bounce: 0 }}
              className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-[var(--r-surface)] border border-border bg-card p-1 [box-shadow:var(--e-overlay)]"
            >
              {!digitado && suggestions.length > 0 && (
                <p className="px-2 pb-1 pt-1.5 text-xs text-muted-foreground">{suggestionsLabel}</p>
              )}
              {vazio ? (
                <p className="px-2 py-3 text-muted-foreground">Nada com “{digitado}”.</p>
              ) : (
                <ul id={listaId} role="listbox" aria-label={label}>
                  {lista.map((item, n) => (
                    <li
                      key={item.id}
                      id={`${id}-r-${n}`}
                      role="option"
                      aria-selected={n === ativo}
                      onPointerMove={() => ativo !== n && setAtivo(n)}
                      // Sem isto o clique tira o foco do campo antes de escolher, e o blur dobra tudo.
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => escolher(item)}
                      className={cn(
                        "flex cursor-pointer flex-col rounded-[var(--r-control)] px-2 py-1.5",
                        n === ativo && "bg-muted",
                      )}
                    >
                      <span className="truncate text-foreground">{item.title}</span>
                      {item.meta && <span className="truncate text-xs text-muted-foreground">{item.meta}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <span className="sr-only" aria-live="polite">
          {aberto && digitado ? (vazio ? "Nenhum resultado" : `${lista.length} resultados`) : ""}
        </span>
      </motion.div>
    </div>
  );
}

export default ExpandingSearch;
