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
import { Check, Copy, FileCode } from "lucide-react";
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
      <p className="p-6 text-corpo leading-relaxed text-muted-foreground">
        Este item não expõe props tipadas — é tema, base de CSS ou utilitário. O que ele entrega
        está no código.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {componentes.map((c) => (
        <section key={c.nome} className="p-4 sm:p-5">
          <h3 className="font-mono text-apoio">{c.nome}</h3>
          {c.descricao ? (
            <p className="mt-1 max-w-2xl text-apoio leading-relaxed text-muted-foreground">
              {c.descricao.split("\n")[0]}
            </p>
          ) : null}

          {c.props.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["prop", "tipo", "padrão", ""].map((h) => (
                      <th
                        key={h}
                        className="py-1.5 pr-4 font-mono text-micro font-normal uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {c.props.map((p) => (
                    <tr key={p.nome} className="border-b border-border/60 align-top">
                      <td className="py-2 pr-4 font-mono text-apoio whitespace-nowrap">
                        {p.nome}
                        {p.obrigatoria ? (
                          <span
                            title="obrigatória"
                            className="ml-1 text-[var(--brand)]"
                            aria-label="obrigatória"
                          >
                            *
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4 font-mono text-rotulo text-muted-foreground">
                        {tipoLegivel(p)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-rotulo text-muted-foreground">
                        {p.padrao ?? "—"}
                      </td>
                      <td className="py-2 text-apoio leading-relaxed text-muted-foreground">
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

export function CodigoDoItem({ name }: { name: string }) {
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
      <p className="p-6 text-corpo text-muted-foreground">
        Não deu para ler o item no registry ({erro}). O arquivo continua chegando pelo{" "}
        <span className="font-mono">add</span>.
      </p>
    );
  }

  if (!arquivos) {
    return <div className="m-4 h-40 animate-pulse rounded-[var(--r-control,0.5rem)] bg-muted/40" />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border px-4 py-2 sm:px-5">
        {arquivos.map((f, i) => (
          <button
            key={f.path}
            type="button"
            onClick={() => setAtivo(i)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-[var(--r-control,0.5rem)] px-2 py-1 font-mono text-rotulo transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)]",
              i === ativo
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileCode className="h-3 w-3" />
            {f.path.split("/").pop()}
          </button>
        ))}

        <button
          type="button"
          onClick={copy}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-[var(--r-control,0.5rem)] border border-border px-2 py-1 font-mono text-micro text-muted-foreground transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-out)] hover:border-[var(--brand)] hover:text-foreground"
        >
          {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {done ? "copiado" : "copiar arquivo"}
        </button>
      </div>

      <Codigo
        codigo={arquivo?.content ?? ""}
        linguagem={linguagemDe(arquivo?.path ?? "")}
        numerado
        className="min-h-0 flex-1 bg-muted/20 p-4 sm:p-5"
      />
    </div>
  );
}
