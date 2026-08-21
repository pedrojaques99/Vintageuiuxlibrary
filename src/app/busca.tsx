"use client";

/**
 * A busca por teclado — a porta que não depende de saber onde a peça mora.
 *
 * O catálogo é fatiado por família porque 81 demos vivas numa página só é um
 * ventilador. A fatia resolve o custo e cria um problema: quem não sabe que o
 * `scrub-input` é da família "trabalho" tem de abrir as seis pra achar. Um
 * índice que só se percorre é um índice que se ignora.
 *
 * Então: `⌘K` abre de qualquer seção, digita, entra. (`/` não: essa tecla já é
 * do campo de busca da grade, que procura DENTRO da fatia aberta. Duas coisas
 * na mesma tecla é o jeito mais rápido de a pessoa parar de usar as duas.)
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
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[12vh] z-[60] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden",
            "rounded-[var(--r-surface,0.875rem)] border border-border bg-background shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <Dialog.Title className="sr-only">Buscar no catálogo</Dialog.Title>

          {/* `shouldFilter={false}`: quem filtra é o `haystack` da casa, com
              radical em português. O filtro do cmdk casa substring sem acento
              nem radical, e devolveria menos do que o catálogo promete. */}
          <Command shouldFilter={false} loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={termo}
                onValueChange={setTermo}
                placeholder="Buscar componente, tag, dependência…"
                className="h-11 w-full bg-transparent text-corpo text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                {resultados.length}
              </span>
            </div>

            <Command.List className="max-h-[min(400px,60vh)] overflow-y-auto overscroll-contain p-1.5">
              <Command.Empty className="px-3 py-8 text-center text-corpo text-muted-foreground">
                Nada com esse nome. O acervo tem {CATALOG.length} peças — tente uma tag
                (&ldquo;foto&rdquo;, &ldquo;board&rdquo;) ou uma dependência (&ldquo;gsap&rdquo;).
              </Command.Empty>

              {porFamilia
                ? porFamilia.map((g) => (
                    <Command.Group
                      key={g.key}
                      heading={g.label}
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-micro [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
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

            <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 font-mono text-micro text-muted-foreground">
              <span>
                <Tecla>↑</Tecla> <Tecla>↓</Tecla> navega
              </span>
              <span>
                <Tecla>↵</Tecla> abre
              </span>
              <span className="ml-auto">
                <Tecla>esc</Tecla> fecha
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const Tecla = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border border-border px-1">{children}</kbd>
);

function Linha({ item, onEscolher }: { item: CatalogItem; onEscolher: (n: string) => void }) {
  return (
    <Command.Item
      value={item.name}
      onSelect={() => onEscolher(item.name)}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[var(--r-control,0.5rem)] px-2 py-2",
        // Marca como fundo e borda no item ativo, nunca como cor de texto.
        "data-[selected=true]:bg-muted data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--brand)]",
      )}
    >
      <span className="shrink-0 font-mono text-apoio text-foreground">{item.name}</span>
      <span className="min-w-0 flex-1 truncate text-rotulo text-muted-foreground">
        {item.title}
      </span>
      {ehNovo(item.name) ? (
        <span className="shrink-0 rounded-full border border-[var(--brand)] px-1.5 py-px font-mono text-micro uppercase tracking-wider">
          novo
        </span>
      ) : null}
      <span className="shrink-0 rounded-full border border-border px-1.5 py-px font-mono text-micro uppercase tracking-wider text-muted-foreground">
        {TYPE_LABEL[item.type]}
      </span>
    </Command.Item>
  );
}

/**
 * `⌘K` / `Ctrl+K` abrem a busca. `/`, não.
 *
 * A barra já é do campo de busca da grade (`Gallery`), que foca o input da
 * fatia aberta. Dois ouvintes na mesma tecla dariam duas coisas ao mesmo tempo,
 * e o atalho passaria a significar duas coisas dependendo da seção — que é a
 * forma mais rápida de a pessoa parar de usar os dois.
 *
 * A divisão de trabalho é essa: `/` busca DENTRO da fatia aberta, `⌘K` busca no
 * acervo inteiro de qualquer lugar do site.
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
      className="alvo-toque flex h-8 items-center gap-2 rounded-[var(--r-control,0.5rem)] border border-border px-2 text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground"
    >
      <Search className="h-3.5 w-3.5" />
      {/*
        Rótulo e tecla só a partir de `xl`.
        
        Em `sm` eles cabiam na conta do botão e não cabiam na do cabeçalho: com
        o seletor de marca, o tema, a densidade e o "entrar", a fileira da
        direita passava a largura da janela a 768px e a página inteira ganhava
        rolagem horizontal. Ícone sozinho é um alvo legítimo — o atalho continua
        valendo e a dica volta assim que há espaço pra ela.
      */}
      <span className="hidden text-rotulo xl:inline">Buscar</span>
      <kbd className="hidden rounded border border-border px-1 font-mono text-micro xl:inline">
        {mac ? "⌘" : "ctrl"}K
      </kbd>
    </button>
  );
}
