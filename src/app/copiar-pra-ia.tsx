"use client";

/**
 * Copiar pra IA — a peça em texto, do jeito que um agente consegue usar.
 *
 * Quem instala componente hoje quase nunca digita o `add`: cola um pedido num
 * agente e deixa ele resolver. E o agente não vê a vitrine — não vê o palco, não
 * vê os knobs, não vê a tabela de props. Se a única saída da página for um
 * comando, tudo que a pessoa configurou aqui se perde no caminho, e o agente
 * escreve o componente com os valores que ele adivinhou.
 *
 * As quatro saídas cobrem os quatro pedidos que aparecem:
 *
 * - **prompt** — a peça inteira em texto (o que é, como instalar, como usar com
 *   a configuração atual, quais props existem, o que ela puxa). É o que se cola
 *   num chat que não tem acesso ao repositório.
 * - **código configurado** — só o JSX com os knobs aplicados, pra quem já tem a
 *   peça instalada e só quer a chamada.
 * - **fonte** — os arquivos do registry, os mesmos que o `add` grava. Pra agente
 *   que vai adaptar a peça em vez de usá-la.
 * - **comando** — o `add`, no gerenciador escolhido na ficha.
 *
 * A fonte é buscada do registry na hora do clique, não no carregamento da
 * página: é meia dúzia de KB por item que 95% das visitas não pedem.
 */

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Code2, FileCode, Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { depKeysOf } from "./deps";
import { REGISTRY_URL, installCommand, registryItemUrl } from "./registry-meta";
import { snippetDeUso, valorAtual, type Controle, type ValorDeKnob } from "./controls";
import { TYPE_LABEL, type CatalogItem } from "./catalog";
import propsGerados from "./props.generated.json";

interface PropDoc {
  nome: string;
  tipo: string;
  obrigatoria: boolean;
  padrao: string | null;
  valores?: string[];
}

const DOCS = propsGerados as unknown as Record<
  string,
  { nome: string; descricao: string | null; props: PropDoc[] }[]
>;

/** `finish: "grayscale" | "mono" | "none" = "grayscale"` */
const assinaturaDaProp = (p: PropDoc) =>
  `${p.nome}${p.obrigatoria ? "" : "?"}: ${p.valores?.length ? p.valores.map((v) => `"${v}"`).join(" | ") : p.tipo}` +
  (p.padrao ? ` = ${p.padrao}` : "");

/**
 * O prompt.
 *
 * Escrito em primeira pessoa do plural e sem floreio: quem lê é um modelo, e o
 * que ele precisa é fato — nome, comando, chamada, API. A configuração atual
 * entra como código, não como descrição, porque descrição de configuração é
 * exatamente o lugar onde a informação se perde.
 */
function montarPrompt(
  item: CatalogItem,
  controles: Controle[],
  props: Record<string, ValorDeKnob>,
) {
  const linhas: string[] = [];

  linhas.push(`# ${item.title} (\`${item.name}\`)`);
  linhas.push("");
  linhas.push(item.description);
  linhas.push("");
  linhas.push(`Tipo: ${TYPE_LABEL[item.type]}. Vem do registry shadcn \`@visant/ui\`.`);
  linhas.push("");
  linhas.push("## Instalar");
  linhas.push("");
  linhas.push("```bash");
  linhas.push(installCommand(item.name));
  linhas.push("```");

  const deps = depKeysOf(item.name);
  if (deps.length) {
    linhas.push("");
    linhas.push(`Puxa junto: ${deps.join(", ")}.`);
  }

  if (item.knobs && controles.length) {
    linhas.push("");
    linhas.push("## Usar");
    linhas.push("");
    linhas.push("```tsx");
    linhas.push(snippetDeUso(item.knobs, controles, props));
    linhas.push("```");
    linhas.push("");
    linhas.push(
      "Essa é a configuração que está na tela agora; o que não aparece está no padrão do componente.",
    );
  }

  const componentes = DOCS[item.name] ?? [];
  if (componentes.length) {
    linhas.push("");
    linhas.push("## API");
    for (const c of componentes) {
      if (!c.props.length) continue;
      linhas.push("");
      linhas.push(`### ${c.nome}`);
      linhas.push("");
      for (const p of c.props) linhas.push(`- \`${assinaturaDaProp(p)}\``);
    }
  }

  linhas.push("");
  linhas.push(`Fonte e demo: https://ui.visantlabs.com/c/${item.name}`);
  return linhas.join("\n");
}

async function buscarFonte(name: string) {
  const r = await fetch(registryItemUrl(name, REGISTRY_URL));
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json = (await r.json()) as { files?: { path: string; content?: string }[] };
  return (json.files ?? [])
    .map((f) => `// ${f.path}\n${f.content ?? ""}`)
    .join("\n\n/* ─────────────────────────────────────────────────────── */\n\n");
}

const ITENS = [
  { chave: "prompt", label: "Prompt pronto", icon: Sparkles },
  { chave: "uso", label: "Código como está", icon: Code2 },
  { chave: "fonte", label: "Arquivo-fonte", icon: FileCode },
  { chave: "comando", label: "Comando de instalar", icon: Terminal },
] as const;

type Chave = (typeof ITENS)[number]["chave"];

export function CopiarPraIA({
  item,
  controles,
  props,
}: {
  item: CatalogItem;
  controles: Controle[];
  props: Record<string, ValorDeKnob>;
}) {
  const [feito, setFeito] = React.useState<Chave | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  const copiar = React.useCallback(async (chave: Chave, texto: () => string | Promise<string>) => {
    try {
      await navigator.clipboard.writeText(await texto());
      setFeito(chave);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeito(null), 1400);
    } catch {
      // Clipboard negado ou a fonte não respondeu. Silêncio aqui é pior que
      // erro: sem sinal a pessoa cola o que estava antes e não entende.
      setFeito(null);
    }
  }, []);

  const acao = (chave: Chave) => {
    if (chave === "prompt") return () => montarPrompt(item, controles, props);
    if (chave === "uso")
      return () => (item.knobs ? snippetDeUso(item.knobs, controles, props) : item.name);
    if (chave === "fonte") return () => buscarFonte(item.name);
    return () => installCommand(item.name);
  };

  return (
    <Menu.Root>
      {/* O segundo botão da ficha: tom de superfície, nunca o destaque — esse é
          do comando de instalar, logo abaixo. */}
      <Menu.Trigger
        className={cn(
          "alvo-toque flex h-10 w-full items-center justify-center gap-2 rounded-control bg-casa-tile-2 px-3 text-casa-base text-casa-fg",
          "transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
          "hover:bg-[color-mix(in_oklch,var(--casa-tile-2),var(--casa-fg)_6%)] data-[state=open]:bg-[color-mix(in_oklch,var(--casa-tile-2),var(--casa-fg)_6%)]",
        )}
      >
        <Sparkles className="h-4 w-4 text-casa-fg-2" />
        Copiar pra IA
        <ChevronDown className="h-3.5 w-3.5 text-casa-fg-3" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Content
          align="center"
          sideOffset={6}
          className={cn(
            "casa z-[70] w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-tile bg-casa-tile-2 p-1.5 [box-shadow:var(--casa-shadow)]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          )}
        >
          {ITENS.map(({ chave, label, icon: Icon }) => (
            <Menu.Item
              key={chave}
              // `onSelect` fecha o menu por padrão, e fechar antes de o clipboard
              // resolver cancela a promessa em alguns navegadores.
              onSelect={(e) => {
                e.preventDefault();
                void copiar(chave, acao(chave));
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-casa-base text-casa-fg-2 outline-none data-[highlighted]:bg-casa-tile data-[highlighted]:text-casa-fg"
            >
              {feito === chave ? (
                <Check className="h-4 w-4 shrink-0 text-casa-fg" />
              ) : (
                <Icon className="h-4 w-4 shrink-0" />
              )}
              {feito === chave ? "Copiado" : label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
