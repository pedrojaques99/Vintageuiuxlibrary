#!/usr/bin/env node
/**
 * O que cada item ARRASTA para o `package.json` de quem instala.
 *
 * O `registry.json` já sabe disso — `deps-check.mjs` mantém o campo honesto lendo
 * os imports reais. O que faltava era a vitrine dizer. A pergunta "esse marquee
 * puxa gsap?" era respondida abrindo o JSON cru, e quem não abre instala e
 * descobre depois, no `npm ls`.
 *
 * Duas decisões que mandam neste arquivo:
 *
 * - **Transitivo, não declarado.** `generating-tile` não importa nada de npm, mas
 *   puxa `@visant/working-glyph`, que importa `lucide-react`. Mostrar zero ali
 *   seria mentir com o dado certo. O `shadcn add` resolve a cadeia inteira, então
 *   a vitrine mostra a cadeia inteira.
 * - **Item base do shadcn não conta.** `button`, `table`, `checkbox` sem namespace
 *   são do shadcn, não nossos: não temos o `dependencies` deles e chutar o radix
 *   que cada um puxa seria inventar número. Eles aparecem na cadeia do `add` de
 *   qualquer jeito, e quem consome já tem o shadcn instalado.
 *
 * Saída: `src/app/deps.generated.json` — `{ "<item>": ["gsap", "lenis"] }`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));

const porNome = new Map(registry.items.map((i) => [i.name, i]));

/**
 * O nome do nosso item dentro de uma `registryDependency`, ou `null` se for
 * item base do shadcn.
 *
 * As duas formas convivem no arquivo de propósito: o `@visant/x` é o que se lê,
 * e a URL absoluta é o que faz o `shadcn add` funcionar em projeto que ainda não
 * configurou o namespace. Aqui as duas viram o mesmo nome.
 */
const nomeDoItem = (dep) => {
  if (dep.startsWith("@visant/")) return dep.slice("@visant/".length);
  const url = dep.match(/^https?:\/\/.+\/r\/(.+)\.json$/);
  return url ? url[1] : null;
};

/** Resolve a cadeia. `vistos` corta ciclo — e ciclo aqui é bug, não é impossível. */
function resolver(nome, vistos = new Set()) {
  if (vistos.has(nome)) return new Set();
  vistos.add(nome);

  const item = porNome.get(nome);
  if (!item) return new Set();

  const saida = new Set(item.dependencies ?? []);
  for (const dep of item.registryDependencies ?? []) {
    const alvo = nomeDoItem(dep);
    if (!alvo) continue;
    for (const p of resolver(alvo, vistos)) saida.add(p);
  }
  return saida;
}

const saida = {};
for (const item of registry.items) {
  const pacotes = [...resolver(item.name)].sort();
  if (pacotes.length) saida[item.name] = pacotes;
}

const destino = join(ROOT, "src", "app", "deps.generated.json");
writeFileSync(destino, JSON.stringify(saida, null, 2) + "\n");

const distintos = new Set(Object.values(saida).flat());
console.log(
  `dependências: ${distintos.size} pacotes distintos em ${Object.keys(saida).length} de ${registry.items.length} itens → src/app/deps.generated.json`,
);
console.log(`  ${[...distintos].sort().join(", ")}`);
