"use client";

/**
 * O índice do acervo, sempre na tela.
 *
 * A vitrine tinha três portas — kits, catálogo, marca — e as três eram um
 * `SegmentedControl` de três palavras no cabeçalho. Isso responde "onde estou",
 * e não responde a única pergunta que faz alguém instalar alguma coisa: **o que
 * existe aqui dentro?**
 *
 * A resposta estava a dois cliques (abrir o catálogo, abrir a fatia) e nenhuma
 * das duas telas mostrava o tamanho do acervo de uma vez. Quem chegava por link
 * de peça via um componente e ia embora sem suspeitar dos outros oitenta — e
 * library que não mostra o tamanho é library que a pessoa reescreve por não
 * saber que já tinha.
 *
 * Então a lista inteira mora aqui, aberta, rolável, com a categoria como
 * cabeçalho e o selo do que entrou por último. Ela não filtra a grade: cada
 * nome é um atalho pra ficha daquela peça. Quem quer filtrar usa os chips da
 * grade ou o `⌘K`; a sidebar é o índice, não um quarto controle.
 *
 * Some abaixo de `lg`. No celular a coluna comeria metade da tela pra listar o
 * que a grade já lista logo abaixo — lá a porta continua sendo a busca.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { CATALOG, FAMILIES, type Family } from "./catalog";
import { ehNovo, quantosNovos } from "./novidades";

const POR_FAMILIA = FAMILIES.map((f) => ({
  ...f,
  itens: CATALOG.filter((i) => i.family === f.key),
})).filter((g) => g.itens.length);

export interface SidebarProps {
  /** Seção aberta — decide qual grupo do topo aparece marcado. */
  view: "kits" | "catalogo" | "marca";
  familia: Family | null;
  /** Peça aberta em foco, se houver. */
  focus: string | null;
  onView: (v: SidebarProps["view"]) => void;
  onFamilia: (f: Family | null) => void;
  onFocus: (name: string) => void;
}

const SECOES = [
  { value: "kits" as const, label: "Kits" },
  { value: "catalogo" as const, label: "Catálogo" },
  { value: "marca" as const, label: "Marca" },
];

export function Sidebar({ view, familia, focus, onView, onFamilia, onFocus }: SidebarProps) {
  const ativo = React.useRef<HTMLButtonElement>(null);

  // Chegar por `/c/<peça>` põe o item ativo no meio de uma lista de oitenta;
  // sem isto a coluna abre no topo e a peça em foco não aparece nela.
  React.useEffect(() => {
    ativo.current?.scrollIntoView({ block: "nearest" });
  }, [focus, familia]);

  return (
    <nav
      aria-label="Índice da library"
      className={cn(
        "sticky hidden shrink-0 self-start overflow-y-auto overscroll-contain border-r border-border lg:block",
        "top-[var(--shell-header-h)] h-[calc(100dvh-var(--shell-header-h))] w-[232px]",
      )}
    >
      <div className="flex flex-col gap-5 px-3 py-5">
        <Grupo titulo="Seções">
          {SECOES.map((s) => (
            <Linha
              key={s.value}
              rotulo={s.label}
              // Uma seção só está "aberta" quando nada mais específico está: com
              // uma fatia aberta, quem manda na leitura é a categoria.
              ativa={view === s.value && !familia && !focus}
              onClick={() => onView(s.value)}
            />
          ))}
        </Grupo>

        <Grupo titulo={`Catálogo · ${CATALOG.length} peças`} nota={`${quantosNovos} novas`}>
          <Linha
            rotulo="Todas as categorias"
            ativa={view === "catalogo" && !familia && !focus}
            onClick={() => onFamilia(null)}
          />
        </Grupo>

        {POR_FAMILIA.map((g) => (
          <Grupo
            key={g.key}
            titulo={g.label}
            nota={String(g.itens.length)}
            onTitulo={() => onFamilia(g.key)}
            marcado={familia === g.key}
          >
            {g.itens.map((i) => (
              <Linha
                key={i.name}
                ref={focus === i.name ? ativo : undefined}
                rotulo={i.name}
                mono
                novo={ehNovo(i.name)}
                ativa={focus === i.name}
                onClick={() => onFocus(i.name)}
              />
            ))}
          </Grupo>
        ))}
      </div>
    </nav>
  );
}

function Grupo({
  titulo,
  nota,
  onTitulo,
  marcado,
  children,
}: {
  titulo: string;
  nota?: string;
  onTitulo?: () => void;
  marcado?: boolean;
  children: React.ReactNode;
}) {
  const Cabecalho = onTitulo ? "button" : "div";
  return (
    <section>
      <Cabecalho
        {...(onTitulo ? { type: "button" as const, onClick: onTitulo } : {})}
        className={cn(
          "mb-1 flex w-full items-center gap-2 px-2 text-left font-mono text-micro uppercase tracking-wider",
          marcado ? "text-foreground" : "text-muted-foreground",
          onTitulo && "transition-colors [transition-duration:var(--dur-fast)] hover:text-foreground",
        )}
      >
        <span className="truncate">{titulo}</span>
        {nota ? <span className="ml-auto shrink-0 tabular-nums opacity-70">{nota}</span> : null}
      </Cabecalho>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

const Linha = React.forwardRef<
  HTMLButtonElement,
  {
    rotulo: string;
    ativa?: boolean;
    mono?: boolean;
    novo?: boolean;
    onClick: () => void;
  }
>(function Linha({ rotulo, ativa, mono, novo, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={ativa ? "true" : undefined}
      className={cn(
        "flex items-center gap-1.5 rounded-[var(--r-control,0.5rem)] px-2 py-1 text-left transition-colors",
        "[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
        mono ? "font-mono text-rotulo" : "text-apoio",
        // Marca em borda e fundo. Como cor de texto ela dá 1,29:1 no papel claro
        // — o item ativo ficaria menos legível que os inativos.
        ativa
          ? "border border-[var(--brand)] bg-muted text-foreground"
          : "border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <span className="truncate">{rotulo}</span>
      {novo ? (
        <span className="ml-auto shrink-0 rounded-full border border-[var(--brand)] px-1 text-[0.5625rem] uppercase tracking-wider">
          novo
        </span>
      ) : null}
    </button>
  );
});
