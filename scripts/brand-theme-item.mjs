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

// O motor mora no visantlabs-os. Importado por caminho absoluto porque os dois
// repos têm ciclos de vida separados de propósito — acoplar por workspace
// obrigaria a um monorepo que ninguém pediu.
const ENGINE = process.env.BRAND_TOKENS_PATH
  ?? "Z:/Cursor/visantlabs-os/packages/brand-tokens";

// `oklchStr` vem do próprio motor: um conversor só, para o item do registry e o
// CSS emitido nunca divergirem no arredondamento.
const { compileBrandTokens, loadCraft, oklchStr } = await import(`file:///${ENGINE}/src/engine.js`);
const { fetchBrand, brandSlug } = await import(`file:///${ENGINE}/src/fetch-brand.js`);

/**
 * Compila uma marca num item `registry:theme`.
 *
 * Só cssVars — zero componente. É essa separação que permite o mesmo `marquee`
 * sair lime numa marca e âmbar noutra sem fork: o componente nunca soube a cor.
 */
export function buildBrandThemeItem(brand) {
  const compiled = compileBrandTokens(brand);
  const craft = loadCraft();
  const { themes, shadow, type, meta } = compiled;

  const colorVars = (t) =>
    Object.fromEntries(Object.entries(t).map(([k, v]) => [k, oklchStr(v)]));

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: `theme-${brandSlug(brand)}`,
    type: "registry:theme",
    title: `${meta.name ?? brandSlug(brand)} — brand theme`,
    author: "Visant Labs <visantsupply@gmail.com>",
    description:
      `Tokens gerados de brand guideline ${meta.brandId ?? "?"} v${meta.version ?? "?"}. ` +
      `Contraste AA garantido por construção. Não editar à mão — regenerar.`,
    cssVars: {
      theme: {
        // Layer 2 — o esqueleto invariante. Igual em toda marca, de propósito:
        // derivar raio/densidade/motion por marca reintroduz genericidade por
        // aleatoriedade.
        "font-sans": `'${type.sans}', ui-sans-serif, system-ui, sans-serif`,
        "font-display": `'${type.display}', ui-sans-serif, system-ui, sans-serif`,
        "r-control": craft.radius.control,
        "r-surface": craft.radius.surface,
        "r-pill": craft.radius.pill,
        "e-flat": craft.elevation.flat,
        "e-raised": craft.elevation.raised,
        "e-overlay": craft.elevation.overlay,
        "e-modal": craft.elevation.modal,
        focus: craft.focus,
        ...craft.motion,
        ...craft.density.comfortable,
      },
      light: { ...colorVars(themes.light), shadow: shadow.light },
      dark: { ...colorVars(themes.dark), shadow: shadow.dark },
    },
    css: {
      // Superfície de trabalho (fila, board, admin) roda mais densa — throughput.
      '[data-density="compact"]': Object.fromEntries(
        Object.entries(craft.density.compact).map(([k, v]) => [`--${k}`, v]),
      ),
    },
    meta: {
      brandId: meta.brandId,
      brandName: meta.name,
      brandVersion: meta.version,
      completeness: meta.completeness,
      engine: "@visant/brand-tokens",
    },
  };
}

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
