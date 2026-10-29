/**
 * Coletor de bug report da vitrine — dev only.
 *
 * O ciclo que isto fecha: você está olhando um card, vê que a peça quebrou, e a
 * distância entre ver e registrar é um clique. Sem abrir issue, sem trocar de
 * janela, sem lembrar o nome exato do componente meia hora depois.
 *
 * Grava em dois formatos de propósito: o `.jsonl` é o dado (append-only, uma
 * linha por reporte, nunca reescrito a não ser para marcar resolvido) e o `.md`
 * é a leitura — derivado, agrupado por componente, é o que o agente abre.
 *
 * Só sobe em `serve`. Em produção não existe processo Node para receber nada, e
 * um endpoint de escrita exposto num site público seria um formulário de spam.
 */

import fs from "node:fs";
import path from "node:path";

const DIR = "bugs";
const JSONL = path.join(DIR, "reports.jsonl");
const MD = path.join(DIR, "REPORTS.md");

const SEVERIDADES = {
  quebrado: "Quebrado",
  visual: "Visual",
  duvida: "Dúvida",
};

function raiz(root) {
  return (rel) => path.resolve(root, rel);
}

export function readReports(root = process.cwd()) {
  const abs = raiz(root)(JSONL);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readFileSync(abs, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((linha) => {
      try {
        return JSON.parse(linha);
      } catch {
        // Linha corrompida não pode derrubar o painel inteiro: ela some da
        // leitura e continua no arquivo pra inspeção manual.
        return null;
      }
    })
    .filter(Boolean);
}

function writeAll(root, reports) {
  const p = raiz(root);
  fs.mkdirSync(p(DIR), { recursive: true });
  fs.writeFileSync(p(JSONL), reports.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  fs.writeFileSync(p(MD), renderMarkdown(reports), "utf8");
}

function bloco(r) {
  const meta = [
    r.severidade ? SEVERIDADES[r.severidade] ?? r.severidade : null,
    r.viewport,
    r.tema,
    r.marca ? `marca: ${r.marca}` : null,
    r.data?.slice(0, 16).replace("T", " "),
  ]
    .filter(Boolean)
    .join(" · ");

  return [`- **${r.id}** — ${r.mensagem}`, `  <sub>${meta}</sub>`].join("\n");
}

export function renderMarkdown(reports) {
  const abertos = reports.filter((r) => !r.resolvido);
  const fechados = reports.filter((r) => r.resolvido);

  const porItem = new Map();
  for (const r of abertos) {
    if (!porItem.has(r.item)) porItem.set(r.item, []);
    porItem.get(r.item).push(r);
  }

  const linhas = [
    "# Bug reports da vitrine",
    "",
    "<!-- Gerado por scripts/vite-bug-report.mjs. Não edite à mão: use `npm run bugs -- --resolve <id>`. -->",
    "",
    `**${abertos.length} aberto(s)** · ${fechados.length} resolvido(s)`,
    "",
  ];

  if (!abertos.length) linhas.push("_Nada aberto._", "");

  for (const [item, lista] of [...porItem].sort((a, b) => b[1].length - a[1].length)) {
    linhas.push(`## ${item} (${lista.length})`, "");
    for (const r of lista) linhas.push(bloco(r));
    linhas.push("");
  }

  if (fechados.length) {
    linhas.push("---", "", "<details><summary>Resolvidos</summary>", "");
    for (const r of fechados) linhas.push(`- ~~${r.id} · ${r.item} — ${r.mensagem}~~`);
    linhas.push("", "</details>", "");
  }

  return linhas.join("\n");
}

export function resolveReport(root, id) {
  const reports = readReports(root);
  const alvo = reports.find((r) => r.id === id);
  if (!alvo) return false;
  alvo.resolvido = true;
  writeAll(root, reports);
  return true;
}

/** `chip-3`: legível na conversa e estável mesmo se o arquivo for reordenado. */
function proximoId(reports, item) {
  const n = reports.filter((r) => r.item === item).length + 1;
  return `${item}-${n}`;
}

function corpo(req) {
  return new Promise((resolve, reject) => {
    let bruto = "";
    req.on("data", (c) => {
      bruto += c;
      // Um reporte é uma frase. Qualquer coisa maior que isso é engano ou abuso.
      if (bruto.length > 64_000) reject(new Error("payload grande demais"));
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(bruto || "{}"));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export function bugReportPlugin() {
  return {
    name: "visant-bug-report",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;

      server.middlewares.use("/__bugs", async (req, res, next) => {
        const rota = (req.url ?? "/").split("?")[0];
        const json = (status, data) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(data));
        };

        try {
          if (req.method === "GET" && rota === "/") {
            const abertos = readReports(root).filter((r) => !r.resolvido);
            const counts = abertos.reduce((acc, r) => {
              acc[r.item] = (acc[r.item] ?? 0) + 1;
              return acc;
            }, {});
            return json(200, { total: abertos.length, counts });
          }

          if (req.method === "POST" && rota === "/resolve") {
            const { id } = await corpo(req);
            return json(200, { ok: resolveReport(root, id) });
          }

          if (req.method === "POST" && rota === "/") {
            const body = await corpo(req);
            const item = String(body.item ?? "").trim();
            const mensagem = String(body.mensagem ?? "").trim();
            if (!item || !mensagem) return json(400, { erro: "item e mensagem são obrigatórios" });

            const reports = readReports(root);
            const reporte = {
              id: proximoId(reports, item),
              item,
              mensagem: mensagem.slice(0, 2000),
              severidade: body.severidade in SEVERIDADES ? body.severidade : "quebrado",
              url: String(body.url ?? "").slice(0, 300),
              viewport: String(body.viewport ?? "").slice(0, 40),
              tema: String(body.tema ?? "").slice(0, 20),
              marca: String(body.marca ?? "").slice(0, 60),
              ua: String(body.ua ?? "").slice(0, 300),
              data: new Date().toISOString(),
              resolvido: false,
            };
            reports.push(reporte);
            writeAll(root, reports);
            // O terminal do dev server é onde você já está olhando quando isto
            // acontece — o reporte aparecer lá evita ter que abrir o MD pra saber
            // se gravou.
            server.config.logger.info(`  🐞 bug em ${item}: ${reporte.mensagem}`);
            return json(200, { ok: true, id: reporte.id });
          }
        } catch (e) {
          return json(400, { erro: String(e?.message ?? e) });
        }

        next();
      });
    },
  };
}
