#!/usr/bin/env node
/**
 * ship — build, verify, commit, push, deploy. Uma linha só.
 *
 *   npm run ship -- -m "mensagem do commit"
 *   npm run ship -- --no-deploy        # só até o push
 *   npm run ship -- --dry              # mostra o que faria, não faz
 *
 * A ordem existe por um motivo: os portões rodam ANTES do commit. Publicar um
 * item quebrado é pior que não publicar — o consumidor instala, não funciona, e
 * ele acha que o registry é que é frágil. Falhar aqui é barato; falhar no
 * `shadcn add` de um cliente, não.
 *
 * Os três portões:
 *   1. registry.json parseia, e todo `files[].path` existe no disco
 *   2. zero hex em `registry/visant/` — componente não tem cor própria
 *   3. `shadcn build` + `vite build` passam
 *
 * `registry/vintage/` fica FORA do portão de hex de propósito: aquele kit é
 * skeuomórfico (madeira, LED, metal), onde a cor é a peça, não o tema.
 */
import { execSync } from "node:child_process";
import { promises as dns } from "node:dns";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const DRY = has("--dry");
const DEPLOY = !has("--no-deploy");

const msgIdx = Math.max(argv.indexOf("-m"), argv.indexOf("--message"));
const MESSAGE =
  msgIdx !== -1 && argv[msgIdx + 1]
    ? argv[msgIdx + 1]
    : "Rebuild registry and deploy";

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

let step = 0;
const say = (s) => console.log(`\n${c.bold(`[${++step}] ${s}`)}`);
const ok = (s) => console.log(`    ${c.green("✓")} ${s}`);
const die = (s) => {
  console.error(`\n${c.red("✗ " + s)}\n`);
  process.exit(1);
};

function run(cmd, { capture = false } = {}) {
  if (DRY) {
    console.log(`    ${c.dim("[dry] " + cmd)}`);
    return "";
  }
  return execSync(cmd, {
    cwd: ROOT,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });
}

const quiet = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

// ── Portão 1: o manifesto bate com o disco ───────────────────────────────────
say("Verificando registry.json");
let registry;
try {
  registry = JSON.parse(readFileSync(join(ROOT, "registry.json"), "utf8"));
} catch (e) {
  die(`registry.json não parseia: ${e.message}`);
}

const missing = [];
const names = new Set();
const dupes = [];
for (const item of registry.items ?? []) {
  if (names.has(item.name)) dupes.push(item.name);
  names.add(item.name);
  for (const f of item.files ?? []) {
    if (!existsSync(join(ROOT, f.path))) missing.push(`${item.name} → ${f.path}`);
  }
}
if (dupes.length) die(`Nomes duplicados no registry:\n  ${dupes.join("\n  ")}`);
if (missing.length)
  die(`Arquivos declarados que não existem:\n  ${missing.join("\n  ")}`);
/*
 * Arquivo de bloco PRECISA dizer onde mora.
 *
 * Sem `target`, os arquivos de um bloco caem soltos na raiz de `components/` do
 * projeto de quem instala — e dois blocos que tenham um `index.ts` cada se
 * SOBRESCREVEM em silêncio, com o `add` reportando sucesso. Aconteceu na
 * primeira instalação real do `step-cards` + `testimonial-wall` na visant-board:
 * ficou um `components/index.ts` só, exportando a parede, e os passos sumiram.
 * `types.ts` e `index.ts` são os nomes mais genéricos que existem; é questão de
 * tempo até colidirem com arquivo do próprio projeto.
 */
const semDestino = registry.items
  .filter((i) => i.type === "registry:block")
  .flatMap((i) => i.files.filter((f) => !f.target).map((f) => `${i.name} → ${f.path}`));
if (semDestino.length)
  die(
    `Arquivo de bloco sem \`target\` (colide na pasta de quem instala):\n  ${semDestino.join("\n  ")}`,
  );

ok(`${registry.items.length} itens, todos os arquivos no lugar`);

// ── Portão 0: nada de cliente no que vai para o ar ───────────────────────────
// Primeiro de todos de propósito: build quebrado se conserta, carteira de
// clientes publicada num domínio aberto não se despublica da cabeça de ninguém.
say("Portão de privacidade");
run("node scripts/privacy-check.mjs");

// ── Portão 2: componente não tem cor própria ─────────────────────────────────
say("Portão de hex em registry/visant/");
const HEX = /#[0-9a-fA-F]{6}\b/;

/*
 * Comentário não é regra de estilo.
 *
 * O portão lia o arquivo inteiro, então uma explicação que CITA um hex derrubava
 * o ship. Caso real: o comentário do `erase-field` documenta que o tema claro
 * deste repo declara `--muted-foreground` como hex e o escuro como `oklch(...)`,
 * que é a causa-raiz de um bug de sonda de cor. Apagar o valor apagaria a única
 * pista que explica o conserto para quem ler depois.
 *
 * A regra continua cega para intenção no CÓDIGO, que é onde ela precisa ser
 * cega: "esta cor aqui pode" é como um portão morre. Ela só para de acusar prosa.
 */
const semComentario = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const visantDir = join(ROOT, "registry", "visant");
const offenders = existsSync(visantDir)
  ? walk(visantDir)
      .filter((p) => /\.(tsx?|jsx?|css)$/.test(p))
      .filter((p) => HEX.test(semComentario(readFileSync(p, "utf8"))))
      .map((p) => p.slice(ROOT.length + 1))
  : [];

if (offenders.length)
  die(
    `Hex fixo em componente — use var(--brand), var(--muted), etc:\n  ${offenders.join("\n  ")}`,
  );
ok("zero hex — os componentes trocam de marca junto com o tema");

// ── Portão 3: vitrine e registry falam do mesmo conjunto ─────────────────────
say("Portão de catálogo");
run("node scripts/catalog-check.mjs");

// ── Portão 4: item declara o que importa ─────────────────────────────────────
// Sem isto, o `add` entrega arquivo que não compila na casa de quem instalou —
// e o erro parece do consumidor. Foi assim que 14 itens vintage ficaram
// ininstaláveis por semanas sem ninguém saber.
say("Portão de dependências");
run("node scripts/deps-check.mjs");

// Logo depois do portão, e ANTES do tsc: a vitrine importa o JSON gerado aqui,
// então rodar isto no fim significaria checar tipo contra um arquivo velho.
say("Extração de dependências");
run("node scripts/deps-extract.mjs");

// ── Portão 5: tipos ──────────────────────────────────────────────────────────
// O `vite build` NÃO checa tipos (esbuild só apaga as anotações). Sem este
// portão, `strict: true` no tsconfig é decoração: o erro passa pelo build,
// entra no registry e só aparece no editor de quem instalou o item.
say("Portão de tipos (tsc)");
run("npx tsc --noEmit");

// ── Portão 6: a casca ────────────────────────────────────────────────────────
// Cor e raio da marca, pílula, caixa-alta, contorno e vidro voltam na casca uma
// classe por vez, e nenhum portão acima vê. Ver PLANO-REDESIGN-CASA.md.
say("Portão da casca (casa-lint)");
run("node scripts/casa-lint.mjs");

// ── Builds ───────────────────────────────────────────────────────────────────
say("Build do registry (shadcn)");
run("npx shadcn@latest build");

// A tabela de props, os knobs do painel e as fichas em markdown saem todos do
// TypeScript dos itens. Regerar aqui é o que impede a documentação de descrever
// uma API que já mudou — e a ordem entre eles mora no `build-docs`.
say("Documentação derivada (props, knobs, novidades)");
run("node scripts/build-docs.mjs");

// Preset é o único pedaço da doc escrito à mão. O portão confere cada um contra
// os controles derivados: prop que sumiu, valor fora da faixa e chip que não
// muda nada não passam. Sem isto o defeito é invisível — o chip aparece, a
// pessoa clica, e nada acontece.
say("Portão dos controles");
run("node scripts/controls-check.mjs");

say("Build do site (vite)");
run("npx vite build");

// ── Portão 6: token vira estilo de verdade ───────────────────────────────────
// Roda DEPOIS do build de propósito: metade da checagem compara a fonte com o
// CSS construído, e comparar com o CSS da rodada anterior é comparar com nada.
// Pega a classe que compila limpo e mesmo assim não desenha — o defeito que
// deixou o anel de foco do `brand-selector` morto desde a colheita.
say("Portão de tokens no CSS");
run("node scripts/css-tokens-check.mjs");

// ── Commit ───────────────────────────────────────────────────────────────────
say("Commit");
const branch = quiet("git rev-parse --abbrev-ref HEAD") || "main";
const dirty = quiet("git status --porcelain");

if (!dirty) {
  ok("nada mudou — pulando commit");
} else {
  console.log(c.dim(dirty.split("\n").slice(0, 12).join("\n")));
  if (dirty.split("\n").length > 12)
    console.log(c.dim(`… +${dirty.split("\n").length - 12} arquivos`));
  run("git add -A");
  // stdin para o -F: mensagem com aspas/quebra de linha não vira dor no Windows
  if (DRY) console.log(`    ${c.dim(`[dry] git commit -m "${MESSAGE}"`)}`);
  else
    execSync("git commit -F -", {
      cwd: ROOT,
      input: `${MESSAGE}\n`,
      stdio: ["pipe", "inherit", "inherit"],
    });
  ok(`commitado em ${branch}`);
}

// ── Push ─────────────────────────────────────────────────────────────────────
say(`Push → origin/${branch}`);
run(`git push origin ${branch}`);

// ── Deploy ───────────────────────────────────────────────────────────────────
if (!DEPLOY) {
  console.log(`\n${c.yellow("→ --no-deploy: parando antes da Vercel")}\n`);
  process.exit(0);
}

say("Deploy (Vercel, produção)");
run("npx vercel deploy --prod --yes");

/*
 * O manifesto anuncia um domínio. Ele resolve?
 *
 * `registry.json.homepage` é o endereço que vai no `components.json` de quem
 * consome — se o DNS dele não existe, o `shadcn add` falha na casa do cliente e
 * o problema aparece lá, não aqui. Já aconteceu: `ui.visantlabs.com` estava
 * registrado como domínio do projeto na Vercel e sem registro no DNS, e o ship
 * anunciava esse endereço a cada publicação como se estivesse no ar.
 *
 * Avisa, não mata: o deploy já aconteceu e o site está no ar pelo *.vercel.app.
 */
const homepage = registry.homepage?.replace(/\/$/, "") ?? "";
const host = homepage.replace(/^https?:\/\//, "");
const projectName = existsSync(join(ROOT, ".vercel", "project.json"))
  ? JSON.parse(readFileSync(join(ROOT, ".vercel", "project.json"), "utf8")).projectName
  : null;
const fallback = projectName ? `https://${projectName}.vercel.app` : "";

let base = homepage;
if (host && !DRY) {
  try {
    await dns.resolve(host);
  } catch {
    base = fallback || homepage;
    console.log(`
${c.yellow(`⚠ ${host} não resolve no DNS (NXDOMAIN).`)}
${c.dim(`  O domínio está registrado no projeto da Vercel, mas falta o registro no
  provedor de DNS de visantlabs.com — aponte um CNAME de "ui" para
  cname.vercel-dns.com. Até lá, quem seguir o \`homepage\` do registry.json
  bate num endereço morto; use o de baixo.`)}`);
  }
}

console.log(`
${c.green("Publicado.")}

  Consumir:  npx shadcn@latest add @visant/<item>
  Manifesto: ${base}/r/registry.json

${c.dim("O único teste que prova a colheita é instalar num projeto LIMPO —")}
${c.dim("no repo de origem o CSS e as deps já estão lá, então ele não prova nada.")}
`);
