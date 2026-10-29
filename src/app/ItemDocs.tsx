"use client";

/**
 * A documentação de um item: props e código.
 *
 * As duas metades vêm de fontes que não podem divergir do que é publicado:
 *
 * - **Props** saem de `props.generated.json`, extraído do TypeScript dos mesmos
 *   arquivos que o `shadcn add` entrega (`npm run build:props`). Tabela escrita
 *   à mão para 47 itens envelhece na primeira semana — e doc que mente é pior
 *   que doc que falta, porque quem lê confia.
 * - **Código** é buscado do próprio JSON do registry, em runtime. É literalmente
 *   o arquivo que vai ser copiado para o projeto de quem instalar; não existe
 *   como ele diferir.
 */

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGISTRY_URL, registryItemUrl } from "./registry-meta";
import { useCopy } from "./copy-command";
import { Codigo, linguagemDe } from "./codigo";
import propsGerados from "./props.generated.json";

interface PropDoc {
  nome: string;
  tipo: string;
  obrigatoria: boolean;
  padrao: string | null;
  descricao: string | null;
  /** Os membros da união, quando o tipo é uma união de literais. */
  valores?: string[];
  faixa?: { min?: number; max?: number; step?: number };
}

/**
 * O tipo como ele responde "o que eu posso passar aqui?".
 *
 * A coluna mostrava a palavra `enum` em 48 props — que é o nome da categoria,
 * não a resposta. Quem lia tinha de abrir o código pra descobrir se `finish`
 * aceita três valores ou trinta.
 */
function tipoLegivel(p: PropDoc) {
  if (p.valores?.length) return p.valores.map((v) => `"${v}"`).join(" | ");
  if (p.tipo === "number" && p.faixa) {
    const { min, max } = p.faixa;
    if (min !== undefined && max !== undefined) return `number (${min}–${max})`;
  }
  return p.tipo;
}

interface ComponenteDoc {
  nome: string;
  descricao: string | null;
  props: PropDoc[];
}

const DOCS = propsGerados as Record<string, ComponenteDoc[]>;

export const temDocDeProps = (name: string) => (DOCS[name]?.length ?? 0) > 0;

export function TabelaDeProps({ name }: { name: string }) {
  const componentes = DOCS[name] ?? [];

  if (!componentes.length) {
    return (
      <p className="p-6 text-casa-base text-casa-fg-2">
        Este item não expõe props tipadas: é tema, base de CSS ou utilitário. O que ele entrega
        está no código.
      </p>
    );
  }

  /*
   * A tabela sem grade: linhas separadas por espaço, cabeçalho no tom mais
   * baixo e em caixa normal. O nome da prop é código; o resto é texto.
   */
  return (
    <div className="space-y-8 p-5 sm:p-6">
      {componentes.map((c) => (
        <section key={c.nome}>
          <h3 className="font-casa-mono text-casa-base text-casa-fg">{c.nome}</h3>
          {c.descricao ? (
            <p className="mt-1 max-w-2xl text-casa-base text-casa-fg-2">
              {c.descricao.split("\n")[0]}
            </p>
          ) : null}

          {c.props.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr>
                    {["Prop", "Tipo", "Padrão", ""].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-casa-sm font-normal text-casa-fg-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.props.map((p) => (
                    <tr key={p.nome} className="border-t border-casa-line align-top">
                      <td className="whitespace-nowrap py-2.5 pr-4 font-casa-mono text-casa-sm text-casa-fg">
                        {p.nome}
                        {p.obrigatoria ? (
                          <span title="obrigatória" className="ml-1 text-casa-fg-2" aria-label="obrigatória">
                            *
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4 font-casa-mono text-casa-sm text-casa-fg-2">
                        {tipoLegivel(p)}
                      </td>
                      <td className="py-2.5 pr-4 font-casa-mono text-casa-sm text-casa-fg-2">
                        {p.padrao ?? "—"}
                      </td>
                      <td className="py-2.5 text-casa-sm text-casa-fg-2">
                        {p.descricao?.split("\n")[0] ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

interface ArquivoDoRegistry {
  path: string;
  content?: string;
  target?: string;
}

export function CodigoDoItem({ name, antes }: { name: string; antes?: React.ReactNode }) {
  const [arquivos, setArquivos] = React.useState<ArquivoDoRegistry[] | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);
  const [ativo, setAtivo] = React.useState(0);

  React.useEffect(() => {
    let vivo = true;
    setArquivos(null);
    setErro(null);
    fetch(registryItemUrl(name, REGISTRY_URL))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => vivo && setArquivos(json.files ?? []))
      .catch((e) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [name]);

  const arquivo = arquivos?.[ativo];
  const { done, copy } = useCopy(arquivo?.content ?? "");

  if (erro) {
    return (
      <p className="p-6 text-casa-base text-casa-fg-2">
        Não deu pra ler o item no registry ({erro}). O arquivo continua chegando pelo{" "}
        <code>add</code>.
      </p>
    );
  }

  if (!arquivos) {
    return <div className="m-5 h-40 animate-pulse rounded-control bg-casa-tile-2" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {antes}
      <div className="flex shrink-0 items-center gap-4 overflow-x-auto px-5 pt-4 sm:px-6">
        {arquivos.map((f, i) => (
          <button
            key={f.path}
            type="button"
            onClick={() => setAtivo(i)}
            aria-pressed={i === ativo}
            className={cn(
              "shrink-0 rounded-control font-casa-mono text-casa-sm transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
              i === ativo ? "text-casa-fg" : "text-casa-fg-3 hover:text-casa-fg",
            )}
          >
            {f.path.split("/").pop()}
          </button>
        ))}

        <button
          type="button"
          onClick={copy}
          aria-label={done ? "Copiado" : "Copiar arquivo"}
          title="Copiar arquivo"
          className="casa-icone alvo-toque ml-auto shrink-0"
        >
          {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <Codigo
        codigo={arquivo?.content ?? ""}
        linguagem={linguagemDe(arquivo?.path ?? "")}
        numerado
        className="min-h-0 flex-1 p-5 sm:p-6"
      />
    </div>
  );
}