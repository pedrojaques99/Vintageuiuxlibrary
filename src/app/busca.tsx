"use client";

/**
 * A busca por teclado — a porta que não depende de saber onde a peça mora.
 *
 * O catálogo é fatiado por família porque 81 demos vivas numa página só é um
 * ventilador. A fatia resolve o custo e cria um problema: quem não sabe que o
 * `scrub-input` é da família "trabalho" tem de abrir as seis pra achar. Um
 * índice que só se percorre é um índice que se ignora.
 *
 * Então: `⌘K` abre de qualquer seção, digita, entra. `/` abre a mesma busca a
 * partir da grade: é a única da casa desde que a grade perdeu o campo próprio
 * (eram duas portas pro mesmo dado, uma ao lado da outra).
 *
 * E a busca é a MESMA do catálogo —
 * o `haystack` com radical em português, que faz "arrastar" achar a peça cuja
 * descrição diz "arrasta". Duas buscas na mesma página com regras diferentes
 * seriam duas promessas diferentes sobre o mesmo acervo.
 *
 * A ordenação não é a do arquivo: é por onde o termo casou. Quem digita "rail"
 * quer o item chamado `rail` na primeira linha, não o primeiro item do catálogo
 * que por acaso menciona rail numa tag.
 */

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOG, FAMILIES, TYPE_LABEL, fold, haystack, type CatalogItem } from "./catalog";
import { ehNovo } from "./novidades";

/** O índice, montado uma vez: `haystack` normaliza texto de 81 itens. */
const INDICE = CATALOG.map((item) => ({ item, texto: haystack(item) }));

/**
 * A nota de um item para o termo digitado.
 *
 * `-1` = não casou. Acima disso, quanto maior melhor — e a escala existe pra
 * separar "o nome é isso" de "a palavra aparece em algum lugar da ficha".
 */
function nota(entrada: { item: CatalogItem; texto: string }, termo: string) {
  const t = fold(termo);
  if (!t) return 0;
  const nome = fold(entrada.item.name);
  const titulo = fold(entrada.item.title);

  if (nome === t) return 100;
  if (nome.startsWith(t)) return 80;
  if (titulo.startsWith(t)) return 70;
  if (nome.includes(t)) return 60;
  if (titulo.includes(t)) return 50;
  // O último degrau é o texto inteiro da ficha: descrição, tags, dependências.
  // É o que faz "gsap" listar quem puxa gsap.
  return entrada.texto.includes(t) ? 20 : -1;
}

export function Busca({
  aberto,
  onAberto,
  onEscolher,
}: {
  aberto: boolean;
  onAberto: (v: boolean) => void;
  onEscolher: (name: string) => void;
}) {
  const [termo, setTermo] = React.useState("");

  // Cada abertura começa em branco: paleta que lembra a última busca abre com o
  // resultado de ontem e faz a pessoa apagar antes de digitar.
  React.useEffect(() => {
    if (aberto) setTermo("");
  }, [aberto]);

  const resultados = React.useMemo(() => {
    return INDICE.map((e) => ({ ...e, n: nota(e, termo) }))
      .filter((e) => e.n >= 0)
      .sort((a, b) => b.n - a.n || a.item.name.localeCompare(b.item.name));
  }, [termo]);

  // Sem termo, a lista mantém a ordem por família — é o índice do acervo, e ele
  // vale como resposta pra "o que tem aqui?" tanto quanto pra "cadê o X?".
  const porFamilia = React.useMemo(() => {
    if (termo) return null;
    return FAMILIES.map((f) => ({
      ...f,
      itens: resultados.filter((r) => r.item.family === f.key).map((r) => r.item),
    })).filter((g) => g.itens.length);
  }, [resultados, termo]);

  return (
    <Dialog.Root open={aberto} onOpenChange={onAberto}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[oklch(0_0_0/0.55)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "casa fixed left-1/2 top-[12vh] z-[60] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden",
            "rounded-tile bg-casa-tile outline-none [box-shadow:var(--casa-shadow)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
          )}
        >
          <Dialog.Title className="sr-only">Buscar no catálogo</Dialog.Title>

          {/* `shouldFilter={false}`: quem filtra é o `haystack` da casa, com
              radical em português. O filtro do cmdk casa substring sem acento
              nem radical, e devolveria menos do que o catálogo promete. */}
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-3 px-4">
              <Search className="h-4 w-4 shrink-0 text-casa-fg-3" />
              <Command.Input
                value={termo}
                onValueChange={setTermo}
                placeholder="Buscar componente, tag ou pacote"
                className="h-14 w-full bg-transparent text-casa-lg text-casa-fg outline-none placeholder:text-casa-fg-3"
              />
              <span className="shrink-0 text-casa-sm tabular-nums text-casa-fg-3">
                {resultados.length}
              </span>
            </div>

            <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto overscroll-contain border-t border-casa-line p-1.5">
              <Command.Empty className="px-3 py-10 text-center text-casa-base text-casa-fg-2">
                Nada com esse nome. Tente uma tag, como &ldquo;foto&rdquo;, ou um pacote, como
                &ldquo;gsap&rdquo;.
              </Command.Empty>

              {porFamilia
                ? porFamilia.map((g) => (
                    <Command.Group
                      key={g.key}
                      heading={g.label}
                      className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-casa-sm [&_[cmdk-group-heading]]:text-casa-fg-3"
                    >
                      {g.itens.map((item) => (
                        <Linha key={item.name} item={item} onEscolher={onEscolher} />
                      ))}
                    </Command.Group>
                  ))
                : resultados.map((r) => (
                    <Linha key={r.item.name} item={r.item} onEscolher={onEscolher} />
                  ))}
            </Command.List>

            {/* Sem rodapé de teclas: setas, Enter e Esc numa lista de busca são
                o que a pessoa já tenta sem ler. */}
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Linha({ item, onEscolher }: { item: CatalogItem; onEscolher: (n: string) => void }) {
  return (
    <Command.Item
      value={item.name}
      onSelect={() => onEscolher(item.name)}
      // O item ativo é um tom acima, como em qualquer lista da casa.
      className="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 data-[selected=true]:bg-casa-tile-2"
    >
      <span className="min-w-0 truncate text-casa-base text-casa-fg">{item.title}</span>
      {ehNovo(item.name) ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-casa-fg-2" aria-label="novo" />
      ) : null}
      <code className="ml-auto shrink-0 text-casa-sm text-casa-fg-3">{item.name}</code>
      <span className="w-10 shrink-0 text-right text-casa-sm text-casa-fg-3">
        {TYPE_LABEL[item.type]}
      </span>
    </Command.Item>
  );
}

/**
 * `⌘K` / `Ctrl+K` abrem a busca de qualquer lugar do site. (`/` também, mas só
 * a partir da grade — quem escuta essa tecla é a `Gallery`.)
 */
export function useAtalhoDeBusca(abrir: () => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        abrir();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abrir]);
}

/** O botão do cabeçalho. Existe porque atalho que não se anuncia não se usa. */
export function BotaoDeBusca({ onClick }: { onClick: () => void }) {
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buscar"
      className="alvo-toque flex h-8 items-center gap-2 rounded-control px-2 text-casa-fg-2 transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:text-casa-fg md:w-56 md:bg-casa-tile md:px-3 md:hover:bg-casa-tile-2"
    >
      <Search className="h-4 w-4 shrink-0" />
      {/* O campo largo é a afordância de busca no desktop. No celular fica o
          ícone, que cabe ao lado da marca sem estourar a linha. */}
      <span className="hidden text-casa-base md:inline">Buscar</span>
      <kbd className="ml-auto hidden text-casa-sm text-casa-fg-3 md:inline">
        {mac ? "⌘" : "Ctrl "}K
      </kbd>
    </button>
  );
}
