#!/usr/bin/env node
/**
 * Todo pacote que um item importa tem de estar declarado nele.
 *
 * O teste de instalação em projeto limpo mostrou o buraco: metade dos itens
 * importa `lucide-react` e nenhum declarava. No repo de origem isso passa —
 * o pacote está no `package.json` daqui. Na casa de quem roda o `add`, não está:
 * o arquivo chega, o import falha, e a culpa parece ser do registry (e é).
 *
 * Este script lê os imports reais de cada arquivo declarado no item e compara
 * com o que o item promete:
 *
 *   - `lucide-react`, `framer-motion`, … → `dependencies`
 *   - `@/components/ui/button`           → `registryDependencies`
 *   - `./types`, `./inline-edit`         → outro arquivo do próprio item, ou
 *                                          um item nosso em `registryDependencies`
 *
 * `--fix` escreve as dependências npm que faltam direto no `registry.json`.
 * O resto é decisão humana: pode ser arquivo esquecido, pode ser import morto.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = process.argv.includes("--fix");

const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
const nossos = new Set(registry.items.map((i) => i.name));

/** React entra como peer em qualquer projeto React — declarar seria ruído. */
const IMPLICITOS = new Set(["react", "react-dom", "react/jsx-runtime"]);

/** `@scope/pacote` e `pacote` — sem o caminho interno (`lucide-react/icons`). */
const nomeDoPacote = (spec) =>
  spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];

const IMPORT_RE = /(?:from|import)\s+["']([^"']+)["']/g;

const problemas = [];
let corrigidos = 0;

for (const item of registry.items) {
  const arquivos = (item.files ?? []).filter((f) => /\.(tsx?|jsx?)$/.test(f.path));
  if (!arquivos.length) continue;

  // Todos os arquivos do item, inclusive CSS e outros não-JS: o `kanban.css` é
  // declarado e importado, e ignorá-lo aqui produziria um falso positivo.
  const nomesDeArquivo = new Set(
    (item.files ?? []).map((f) => basename(f.path).replace(/\.\w+$/, "")),
  );
  /*
   * A declaração pode vir com faixa de versão — `@tanstack/react-table@^8.21.3`
   * é sintaxe válida e recomendada do shadcn, e é o que o `add` instala.
   * Comparar a string inteira com o nome importado acusava o item de não
   * declarar exatamente o que ele declara. Corta a faixa antes de comparar,
   * cuidando do `@` inicial do escopo, que não é separador.
   */
  const semVersao = (d) => {
    const at = d.lastIndexOf("@");
    return at > 0 ? d.slice(0, at) : d;
  };
  const declaradas = new Set((item.dependencies ?? []).map(semVersao));
  const declaradasRegistry = new Set(
    (item.registryDependencies ?? []).map((d) => d.replace(/^@visant\//, "")),
  );

  const faltamNpm = new Set();

  for (const f of arquivos) {
    const caminho = join(ROOT, f.path);
    if (!existsSync(caminho)) {
      problemas.push(`${item.name}: declara ${f.path}, que não existe no disco`);
      continue;
    }
    const src = readFileSync(caminho, "utf8");

    for (const [, spec] of src.matchAll(IMPORT_RE)) {
      if (spec.startsWith("@/")) {
        // Alias do projeto: `@/components/ui/button` → item `button`.
        //
        // `nomesDeArquivo` entra aqui pela mesma razão que já entrava no ramo
        // relativo abaixo: um item pode enviar mais de um arquivo, e o `.tsx`
        // importar o `.ts` irmão pelo alias — que é como o consumidor vai ver
        // os dois depois do `add`, já que ambos aterrissam em `src/`. Sem isto,
        // `cover-art` (lib + ui no mesmo item) era acusado de não declarar
        // dependência de si mesmo, e a "correção" seria partir o item em dois
        // só pra agradar o portão.
        const alvo = spec.split("/").pop();
        if (alvo && !declaradasRegistry.has(alvo) && !nomesDeArquivo.has(alvo) && alvo !== "utils") {
          problemas.push(`${item.name}: importa ${spec} sem declarar "${alvo}" em registryDependencies`);
        }
        continue;
      }

      if (spec.startsWith(".")) {
        // Irmão: ou é outro arquivo do item, ou é um item nosso.
        const alvo = basename(spec).replace(/\.\w+$/, "");
        if (!nomesDeArquivo.has(alvo) && !declaradasRegistry.has(alvo)) {
          problemas.push(
            `${item.name}: importa ${spec}, que não está nos files nem em registryDependencies`,
          );
        }
        continue;
      }

      const pacote = nomeDoPacote(spec);
      if (IMPLICITOS.has(pacote) || declaradas.has(pacote)) continue;
      faltamNpm.add(pacote);
    }
  }

  if (faltamNpm.size) {
    if (FIX) {
      item.dependencies = [...new Set([...(item.dependencies ?? []), ...faltamNpm])].sort();
      corrigidos += faltamNpm.size;
      console.log(`  + ${item.name}: ${[...faltamNpm].join(", ")}`);
    } else {
      problemas.push(`${item.name}: importa ${[...faltamNpm].join(", ")} sem declarar em dependencies`);
    }
  }
}

if (FIX) {
  writeFileSync(join(ROOT, "registry.json"), JSON.stringify(registry, null, 2) + "\n");
  console.log(`\n${corrigidos} dependência(s) npm declarada(s).`);
}

if (!problemas.length) {
  console.log("\x1b[32m✓ todo item declara o que importa\x1b[0m");
  process.exit(0);
}

console.error(`\x1b[31m✗ ${problemas.length} problema(s) de dependência:\x1b[0m`);
for (const p of problemas) console.error(`    ${p}`);
process.exit(1);
