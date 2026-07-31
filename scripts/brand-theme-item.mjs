// A ponte: @visant/brand-tokens → um item `registry:theme` do shadcn.
//
// Este arquivo é o elo que faltava entre o motor de tokens (que já resolve
// marca → CSS com AA garantido) e o registry (que já sabe distribuir). Sem ele,
// cada projeto de cliente recomeça transcrevendo cor e fonte na mão.
//
//   node scripts/brand-theme-item.mjs --file <seed.json>   → escreve public/r/theme-<slug>.json
//   node scripts/brand-theme-item.mjs --brand <brandId>    → busca ao vivo (VISANT_API_TOKEN)
//
// A mesma função `buildBrandThemeItem` serve a rota dinâmica
// `ui.visantlabs.com/r/theme-{brandId}.json`: o shadcn só exige que a URL
// devolva um registry-item válido, então a rota é esta função mais um handler.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// O motor agora é pacote publicado — mesma versão que a vitrine importa no
// browser para compilar o vault de quem entra. Era caminho absoluto para o
// repo vizinho, o que só funcionava nesta máquina.
import { fetchBrand } from "@visant/brand-tokens/fetch-brand";
import { buildBrandThemeItem } from "@visant/brand-tokens/registry-item";

export { buildBrandThemeItem };

// --- CLI ---------------------------------------------------------------------

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const argv = process.argv.slice(2);
  const at = (flag) => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : argv[i + 1];
  };

  const brandId = at("--brand");
  const file = at("--file");

  const brand = brandId
    ? await fetchBrand(brandId)
    : JSON.parse(readFileSync(resolve(file ?? `${ENGINE}/src/fixtures/visant.json`), "utf8"));

  const item = buildBrandThemeItem(brand);
  const outDir = join(here, "../public/r");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${item.name}.json`);
  writeFileSync(out, JSON.stringify(item, null, 2) + "\n", "utf8");

  console.log(`✓ ${item.name}`);
  console.log(`  ${item.meta.brandName} · v${item.meta.brandVersion} · vault ${item.meta.completeness}%`);
  console.log(`  display: ${item.cssVars.theme["font-display"].split(",")[0]}`);
  console.log(`  brand:   ${item.cssVars.light.brand}`);
  console.log(`  → ${out}`);
  console.log(`\n  npx shadcn@latest add @visant/${item.name}`);
}
