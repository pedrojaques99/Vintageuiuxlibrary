#!/usr/bin/env node
/**
 * A tabela de props sai do fonte, não da mão de ninguém.
 *
 * Documentação escrita à mão para 47 itens envelhece na primeira semana: alguém
 * adiciona uma prop, esquece a tabela, e a doc passa a mentir — que é pior do
 * que não ter doc, porque quem lê confia. Aqui o `react-docgen-typescript` lê os
 * mesmos arquivos que o `shadcn add` entrega e extrai nome, tipo, obrigatoriedade,
 * padrão e o comentário que já está no código.
 *
 * Saída: `src/app/props.generated.json`, versionado de propósito — assim o build
 * do site não depende de rodar o TypeScript inteiro, e o diff do git mostra
 * quando a API pública de um item mudou. Roda no `ship`, antes do build.
 *
 * Duas coisas que este arquivo carrega além do óbvio, porque quem consome não é
 * só a tabela:
 *
 * - **`valores`** para união de literais. A tabela mostrava a palavra `enum`,
 *   que não é resposta pra pergunta "o que eu posso passar aqui?". E sem os
 *   valores não existe `<select>` no painel de controles.
 * - **`faixa`** para número, lida das tags `@min` / `@max` / `@step` do JSDoc.
 *   Slider sem faixa é slider chutado; quem escreveu a prop sabe o intervalo,
 *   e agora tem onde dizer.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import docgen from "react-docgen-typescript";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

const parser = docgen.withCompilerOptions(
  {
    // `ts.JsxEmit.ReactJSX`, e não a string "react-jsx": o compilador aceita a
    // string só quando o tsconfig passa pelo parser dele. Passando o enum, o
    // programa é criado direto — sem isso, TODO item falhava com uma mensagem
    // sobre `parseJsonSourceFileConfigFileContent` e a saída vinha vazia.
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
    skipLibCheck: true,
    baseUrl: ROOT,
    paths: { "@/*": ["./src/*"] },
  },
  {
    savePropValueAsString: true,
    // Props herdadas de HTMLAttributes são centenas e não dizem nada sobre a
    // peça: o que interessa é o que ESTE componente inventou.
    propFilter: (prop) =>
      !prop.parent || !/node_modules|@types\/react/.test(prop.parent.fileName),
    shouldExtractLiteralValuesFromEnum: true,
    shouldRemoveUndefinedFromOptional: true,
  },
);

/**
 * Os membros de uma união de literais, sem as aspas que o docgen devolve.
 *
 * Devolve `null` quando a união tem qualquer membro que não seja literal de
 * string ou número (`string | false`, `"a" | (string & {})`): controle de
 * escolha só é honesto quando a lista é a lista inteira.
 */
function valoresDaUniao(tipo) {
  const membros = tipo?.value;
  if (!Array.isArray(membros) || membros.length < 2) return null;

  const limpos = membros.map((m) => {
    const bruto = typeof m === "string" ? m : m?.value;
    if (typeof bruto !== "string") return null;
    const semAspas = bruto.replace(/^["']|["']$/g, "");
    // `undefined` e `null` entram na união quando a prop é opcional; a ausência
    // já é representada pelo padrão, então não viram opção de escolha.
    if (semAspas === "undefined" || semAspas === "null") return undefined;
    if (semAspas === bruto && !/^-?\d+(\.\d+)?$/.test(bruto)) return null;
    return semAspas;
  });

  if (limpos.some((v) => v === null)) return null;
  const finais = limpos.filter((v) => v !== undefined);
  return finais.length >= 2 ? finais : null;
}

/** `@min 0 @max 1 @step 0.05` no JSDoc da prop. */
const TAGS_DE_FAIXA = /@(min|max|step)\s+(-?\d+(?:\.\d+)?)/g;

function faixaDe(descricao) {
  if (!descricao) return null;
  const faixa = {};
  for (const [, tag, valor] of descricao.matchAll(TAGS_DE_FAIXA)) faixa[tag] = Number(valor);
  return Object.keys(faixa).length ? faixa : null;
}

/** A descrição sem as tags de faixa — elas viram controle, não texto. */
const semTagsDeFaixa = (d) => (d ? d.replace(TAGS_DE_FAIXA, "").replace(/[ \t]+\n/g, "\n").trim() || null : null);

const saida = {};
let comProps = 0;
let comValores = 0;
let comFaixa = 0;

for (const item of registry.items) {
  const arquivos = (item.files ?? [])
    .map((f) => f.path)
    .filter((p) => p.endsWith(".tsx") || p.endsWith(".ts"))
    .map((p) => join(ROOT, p));
  if (!arquivos.length) continue;

  let docs = [];
  try {
    docs = parser.parse(arquivos);
  } catch (err) {
    console.error(`  ! ${item.name}: ${err.message}`);
    continue;
  }

  const componentes = docs
    .map((d) => ({
      nome: d.displayName,
      descricao: d.description || null,
      props: Object.values(d.props ?? {})
        .map((p) => {
          const valores = valoresDaUniao(p.type);
          const faixa = faixaDe(p.description);
          if (valores) comValores++;
          if (faixa) comFaixa++;
          return {
            nome: p.name,
            tipo: p.type?.name ?? "unknown",
            obrigatoria: p.required,
            padrao: p.defaultValue?.value ?? null,
            descricao: semTagsDeFaixa(p.description),
            ...(valores ? { valores } : {}),
            ...(faixa ? { faixa } : {}),
          };
        })
        .sort((a, b) => Number(b.obrigatoria) - Number(a.obrigatoria) || a.nome.localeCompare(b.nome)),
    }))
    .filter((c) => c.props.length || c.descricao);

  if (componentes.length) {
    saida[item.name] = componentes;
    comProps++;
  }
}

const destino = join(ROOT, "src", "app", "props.generated.json");
writeFileSync(destino, JSON.stringify(saida, null, 2) + "\n");

const totalProps = Object.values(saida).flatMap((cs) => cs.flatMap((c) => c.props)).length;
console.log(
  `props extraídas: ${totalProps} em ${comProps} itens ` +
    `(${comValores} com valores de união, ${comFaixa} com faixa) → src/app/props.generated.json`,
);
