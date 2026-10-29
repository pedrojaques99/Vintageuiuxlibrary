/**
 * A curadoria do acervo: nota e comentário por peça, gravados no repo.
 *
 * O acervo passou de cem peças, e o dono sabe que só uma fração é forte. Sem um
 * lugar pra dizer isso, a peça fraca continua na vitrine com o mesmo peso da
 * boa — e cada visita julga a library pela média, não pelo topo.
 *
 * Mesmo desenho do bug report (`vite-bug-report.mjs`): o botão vive na ficha,
 * só no dev server, e grava em arquivo versionado. Aqui o arquivo é
 * `curadoria/notas.json`, que a vitrine IMPORTA: o que tem nota 2 ou menos (ou
 * está marcado pra excluir) sai do catálogo público no próximo build, e volta
 * sozinho quando a nota sobe. Junto sai `curadoria/CURADORIA.md`, o placar
 * legível.
 *
 *   GET  /__curadoria          → { "<item>": { nota, comentario, excluir, data } }
 *   POST /__curadoria          → { item, nota (1–5), comentario, excluir }
 */

import fs from "node:fs";
import path from "node:path";

const DIR = "curadoria";
const JSON_PATH = path.join(DIR, "notas.json");
const MD_PATH = path.join(DIR, "CURADORIA.md");

/** A régua: abaixo disto a peça sai da vitrine pública. */
export const NOTA_DE_CORTE = 2;

export function lerNotas(root = process.cwd()) {
  const abs = path.resolve(root, JSON_PATH);
  if (!fs.existsSync(abs)) return {};
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return {};
  }
}

export const arquivada = (n) => Boolean(n && (n.excluir || (n.nota && n.nota <= NOTA_DE_CORTE)));

export function renderMarkdown(notas) {
  const linhas = Object.entries(notas).sort((a, b) => (b[1].nota ?? 0) - (a[1].nota ?? 0));
  const excluir = linhas.filter(([, n]) => n.excluir);
  const fora = linhas.filter(([, n]) => !n.excluir && arquivada(n));
  const dentro = linhas.filter(([, n]) => !arquivada(n));
  const linha = ([item, n]) =>
    `| \`${item}\` | ${"★".repeat(n.nota ?? 0)}${"☆".repeat(5 - (n.nota ?? 0))} | ${(n.comentario ?? "").replace(/\|/g, "/").replace(/\n/g, " ")} |`;
  const tabela = (lista) =>
    lista.length ? ["| peça | nota | comentário |", "|---|---|---|", ...lista.map(linha)] : ["_nenhuma_"];
  return [
    "# Curadoria do acervo",
    "",
    "<!-- Gerado por scripts/vite-curadoria.mjs a partir de notas.json. Não edite à mão. -->",
    "",
    `**${dentro.length} na vitrine** · ${fora.length} arquivada(s) (nota ≤ ${NOTA_DE_CORTE}) · ${excluir.length} pra excluir`,
    "",
    "## Na vitrine",
    "",
    ...tabela(dentro),
    "",
    "## Arquivadas (fora da vitrine até a nota subir)",
    "",
    ...tabela(fora),
    "",
    "## Pra excluir de vez (`npm run curadoria -- --excluir`)",
    "",
    ...tabela(excluir),
    "",
  ].join("\n");
}

function gravar(root, notas) {
  const p = (rel) => path.resolve(root, rel);
  fs.mkdirSync(p(DIR), { recursive: true });
  const ordenado = Object.fromEntries(Object.entries(notas).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(p(JSON_PATH), JSON.stringify(ordenado, null, 2) + "\n", "utf8");
  fs.writeFileSync(p(MD_PATH), renderMarkdown(ordenado), "utf8");
}

const corpo = (req) =>
  new Promise((ok, falha) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try {
        ok(JSON.parse(s || "{}"));
      } catch (e) {
        falha(e);
      }
    });
  });

export function curadoriaPlugin() {
  return {
    name: "visant-curadoria",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;
      server.middlewares.use("/__curadoria", async (req, res, next) => {
        const json = (status, data) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(data));
        };
        try {
          if (req.method === "GET") return json(200, lerNotas(root));
          if (req.method === "POST") {
            const b = await corpo(req);
            const item = String(b.item ?? "").trim();
            const nota = Number(b.nota);
            if (!item || !(nota >= 1 && nota <= 5)) return json(400, { erro: "item e nota (1 a 5) são obrigatórios" });
            const notas = lerNotas(root);
            notas[item] = {
              nota,
              comentario: String(b.comentario ?? "").trim().slice(0, 2000),
              excluir: Boolean(b.excluir),
              data: new Date().toISOString().slice(0, 10),
            };
            gravar(root, notas);
            const n = notas[item];
            server.config.logger.info(
              `  ★ ${item}: ${n.nota}/5${n.excluir ? " · pra excluir" : arquivada(n) ? " · arquivada" : ""}${n.comentario ? ` · ${n.comentario}` : ""}`,
            );
            return json(200, { ok: true, notas });
          }
        } catch (e) {
          return json(400, { erro: String(e?.message ?? e) });
        }
        next();
      });
    },
  };
}
