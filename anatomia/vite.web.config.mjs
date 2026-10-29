// Bundle do web component: um .js por figura em public/anatomia/, pra blog, livro e LP estática.
//   <script type="module" src="https://visant-ui.vercel.app/anatomia/como-sobe.js"></script>
//   <visant-anatomia figura="como-sobe"></visant-anatomia>
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const AQUI = dirname(fileURLToPath(import.meta.url));
const LIB = resolve(AQUI, "..", "registry", "visant", "lib");
const ids = readdirSync(LIB)
  .map((f) => /^anatomia-(.+)\.ts$/.exec(f)?.[1])
  .filter((id) => id && !/-controlador$|^(kit|estilo|tipos|nucleo)$/.test(id));
mkdirSync(join(AQUI, "web"), { recursive: true });
const entradas = {};
for (const id of ids) {
  const arq = join(AQUI, "web", `${id}.ts`);
  writeFileSync(arq, `// GERADO por anatomia/vite.web.config.mjs\nimport { definirAnatomia, registrarFigura } from "../../registry/visant/lib/anatomia-nucleo";\nimport figura from "../../registry/visant/lib/anatomia-${id}";\nregistrarFigura(figura);\ndefinirAnatomia();\n`);
  entradas[id] = arq;
}

export default defineConfig({
  publicDir: false,
  build: {
    outDir: resolve(AQUI, "..", "public", "anatomia"),
    emptyOutDir: true,
    target: "es2020",
    lib: { entry: entradas, formats: ["es"], fileName: (_f, nome) => `${nome}.js` },
    rollupOptions: { output: { chunkFileNames: "nucleo-[hash].js" } },
  },
});
