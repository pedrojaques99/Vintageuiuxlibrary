#!/usr/bin/env node
/**
 * O teste que prova a colheita: instalar num projeto LIMPO.
 *
 * O `ship` termina toda publicação dizendo esta frase — e até agora ninguém
 * tinha feito. No repo de origem o CSS, as dependências e os caminhos já estão
 * no lugar, então tudo "funciona" e nada é provado. O erro só aparece na casa de
 * quem rodou o `add`: import de arquivo que o item não declarou, dependência npm
 * que ninguém instalou, alias `@/` que não existe naquele projeto.
 *
 * O que este script faz:
 *
 *   1. cria um projeto Vite + React + TS + Tailwind v4 do zero, num diretório
 *      temporário fora do repo (nada aqui é reaproveitado — é esse o ponto);
 *   2. sobe um servidor estático sobre `public/r`, para o `shadcn` puxar os
 *      itens desta máquina em vez da versão publicada — assim o teste roda ANTES
 *      do deploy, não depois;
 *   3. roda `shadcn add` item por item;
 *   4. compila o projeto com `tsc` e `vite build`.
 *
 * Item que falha é impresso com o erro. `--only <nome,nome>` roda um subconjunto;
 * `--keep` deixa o diretório de pé para inspeção.
 *
 * Não entra no `ship` por padrão: são minutos e rede. Roda por `npm run test:install`
 * e antes de anunciar a library para alguém de fora.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1] ?? "";
};
const KEEP = argv.includes("--keep");
const ONLY = flag("--only");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

// --- servidor do registry local ---------------------------------------------

const MIME = { ".json": "application/json", ".css": "text/css", ".js": "text/javascript" };
const R_DIR = join(ROOT, "public", "r");

function serveRegistry() {
  return new Promise((ready) => {
    const server = createServer((req, res) => {
      const name = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/r\//, "/");
      const file = join(R_DIR, name);
      if (!file.startsWith(R_DIR) || !existsSync(file)) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "text/plain" });
      res.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => ready({ server, port: server.address().port }));
  });
}

// --- projeto de mentira ------------------------------------------------------

/**
 * Comando assíncrono, e não `execSync`.
 *
 * O servidor do registry roda NESTE processo. `execSync` bloqueia o event loop
 * do Node enquanto o comando dura, então o `shadcn` pedia o JSON e ninguém
 * atendia — o erro que aparecia era "Headers Timeout Error", que parece rede e
 * era a nossa própria mão no pescoço do servidor.
 */
function run(cmd, cwd) {
  return new Promise((ok, fail) => {
    const child = spawn(cmd, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0 ? ok(out) : fail(Object.assign(new Error(`exit ${code}`), { stdout: out })),
    );
  });
}

function scaffold(dir, port) {
  mkdirSync(join(dir, "src"), { recursive: true });

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: "visant-smoke",
        private: true,
        type: "module",
        scripts: { build: "tsc --noEmit && vite build" },
        dependencies: { react: "18.3.1", "react-dom": "18.3.1" },
        devDependencies: {
          "@types/react": "18.3.12",
          "@types/react-dom": "18.3.1",
          "@vitejs/plugin-react": "4.7.0",
          "@tailwindcss/vite": "4.1.12",
          tailwindcss: "4.1.12",
          typescript: "5.9.3",
          vite: "6.3.5",
        },
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          allowImportingTsExtensions: true,
          baseUrl: ".",
          paths: { "@/*": ["./src/*"] },
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  writeFileSync(
    join(dir, "vite.config.ts"),
    `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
});
`,
  );

  // `components.json` é o contrato do consumidor: é aqui que o namespace
  // @visant aponta para o registry. Trocamos a URL publicada pelo servidor
  // local para provar os itens DESTA máquina, antes do deploy.
  writeFileSync(
    join(dir, "components.json"),
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: false,
        tsx: true,
        tailwind: { config: "", css: "src/index.css", baseColor: "neutral", cssVariables: true },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          hooks: "@/hooks",
        },
        registries: { "@visant": `http://127.0.0.1:${port}/r/{name}.json` },
      },
      null,
      2,
    ),
  );

  writeFileSync(join(dir, "src", "index.css"), `@import "tailwindcss";\n`);
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`,
  );
  writeFileSync(
    join(dir, "src", "main.tsx"),
    `import { createRoot } from "react-dom/client";
import "./index.css";
createRoot(document.getElementById("root")!).render(<div />);
`,
  );
}

// --- execução ----------------------------------------------------------------

const items = readdirSync(R_DIR)
  .filter((f) => f.endsWith(".json") && f !== "registry.json" && f !== "brands.json")
  .map((f) => f.replace(/\.json$/, ""))
  // Temas de marca são 21 arquivos do mesmo formato: provar um prova todos, e
  // instalar os 21 só faria o teste demorar 3x sem cobrir mais nada.
  .filter((n) => !n.startsWith("theme-") || n === "theme-visant")
  .filter((n) => (ONLY ? ONLY.split(",").includes(n) : true));

console.log(c.bold(`\nInstalação em projeto limpo — ${items.length} itens\n`));

const { server, port } = await serveRegistry();
const dir = mkdtempSync(join(tmpdir(), "visant-smoke-"));
console.log(c.dim(`  projeto: ${dir}`));
console.log(c.dim(`  registry: http://127.0.0.1:${port}/r/{name}.json\n`));

const falhas = [];
try {
  scaffold(dir, port);

  console.log(c.dim("  instalando dependências base…"));
  await run("npm install --silent --no-audit --no-fund", dir);

  for (const name of items) {
    process.stdout.write(`  ${name} … `);
    try {
      await run(`npx --yes shadcn@latest add @visant/${name} --yes --overwrite`, dir);
      console.log(c.green("ok"));
    } catch (err) {
      console.log(c.red("FALHOU"));
      falhas.push({ name, etapa: "add", saida: (err.stdout || err.stderr || String(err)).slice(-600) });
    }
  }

  console.log(c.dim("\n  instalando dependências que os itens pediram…"));
  try {
    await run("npm install --silent --no-audit --no-fund", dir);
  } catch (err) {
    falhas.push({ name: "(npm install)", etapa: "deps", saida: String(err).slice(-600) });
  }

  console.log(c.dim("  compilando…"));
  try {
    await run("npm run build", dir);
    console.log(c.green("  ✓ o projeto limpo compila com os itens instalados"));
  } catch (err) {
    console.log(c.red("  ✗ o projeto NÃO compila"));
    falhas.push({ name: "(build)", etapa: "build", saida: (err.stdout || err.stderr || String(err)).slice(-3000) });
  }
} finally {
  server.close();
  if (!KEEP) rmSync(dir, { recursive: true, force: true });
  else console.log(c.yellow(`\n  --keep: projeto mantido em ${dir}`));
}

if (!falhas.length) {
  console.log(c.green("\n✓ colheita provada: todo item instala e compila fora daqui\n"));
  process.exit(0);
}

console.error(c.red(`\n✗ ${falhas.length} problema(s):\n`));
for (const f of falhas) {
  console.error(c.red(`  ${f.name} [${f.etapa}]`));
  console.error(c.dim(f.saida.split("\n").map((l) => `      ${l}`).join("\n")));
}
process.exit(1);
