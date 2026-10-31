/**
 * O veredito do lab, sem terminal: ui.visantlabs.com/api/lab
 *
 * A rodada diária publica cada experimento como `candidate` (invisível pro
 * público). O dono abre /lab em modo admin e aprova ou descarta; isto aqui faz
 * o mesmo que `pnpm lab:keep` / `lab:discard` (scripts/lab.mjs), só que como UM
 * commit na `main` pela API Git do GitHub. O push na `main` dispara o deploy de
 * produção pela integração Git da Vercel, então em ~1–2 min o card muda.
 *
 *   GET  /api/lab                 → { configured: { admin, github } }   (sem segredo)
 *   POST /api/lab  Authorization: Bearer <LAB_ADMIN_TOKEN>
 *        { id, action: "approve" | "discard" | "verify", reason? }
 *
 * Env (Vercel): LAB_ADMIN_TOKEN, LAB_GITHUB_TOKEN (fine-grained, contents:write
 * só neste repo). Opcional: LAB_GITHUB_REPO (padrão abaixo).
 */

import { createHash, timingSafeEqual } from "node:crypto";

const REPO = process.env.LAB_GITHUB_REPO || "pedrojaques99/Vintageuiuxlibrary";
const BRANCH = "main";
const GH = `https://api.github.com/repos/${REPO}`;
const ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const configured = () => ({
  admin: Boolean(process.env.LAB_ADMIN_TOKEN),
  github: Boolean(process.env.LAB_GITHUB_TOKEN),
});

/* Compara os digests (mesmo tamanho sempre), então o tempo não vaza o token. */
const sha = (s: string) => createHash("sha256").update(s).digest();
const sameToken = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GH}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.LAB_GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
  });
  if (!res.ok) throw Object.assign(new Error(`GitHub ${res.status} em ${path}`), { status: res.status });
  return res.json() as Promise<T>;
}

const readFile = async (path: string) => {
  const f = await gh<{ content: string }>(`/contents/${path}?ref=${BRANCH}`);
  return Buffer.from(f.content, "base64").toString("utf8");
};

/** Um commit só (arquivo + PREFERENCES.md), pra sair um deploy só. */
async function commit(message: string, files: { path: string; content: string | null }[]) {
  const ref = await gh<{ object: { sha: string } }>(`/git/ref/heads/${BRANCH}`);
  const head = await gh<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`);
  const tree = await gh<{ sha: string }>(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: head.tree.sha,
      tree: files.map((f) =>
        f.content === null
          ? { path: f.path, mode: "100644", type: "blob", sha: null }
          : { path: f.path, mode: "100644", type: "blob", content: f.content },
      ),
    }),
  });
  const next = await gh<{ sha: string }>(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
  });
  await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: next.sha, force: false }) });
  return next.sha;
}

async function verdict(id: string, action: "approve" | "discard", reason: string) {
  const file = `lab/experiments/${id}.tsx`;
  const src = await readFile(file);
  if (!/status:\s*"candidate"/.test(src)) throw Object.assign(new Error(`${id} não é candidate`), { status: 409 });
  const prefs = await readFile("lab/PREFERENCES.md");
  const day = new Date().toISOString().slice(0, 10);
  const verb = action === "approve" ? "kept" : "discarded";
  const line = `- ${day} · ${verb} · \`${id}\` · ${reason || "(sem motivo)"} · via /lab\n`;
  const message = `lab: ${action === "approve" ? "keep" : "discard"} ${id}\n\n${reason || "(sem motivo)"}\n\nvia /lab admin`;
  return commit(message, [
    { path: file, content: action === "approve" ? src.replace(/status:\s*"candidate"/, 'status: "kept"') : null },
    { path: "lab/PREFERENCES.md", content: prefs.replace(/\n*$/, "\n") + line },
  ]);
}

export async function GET() {
  return json({ configured: configured() });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "unauthorized" }, 401);
  const expected = process.env.LAB_ADMIN_TOKEN;
  if (!expected) return json({ error: "configure LAB_ADMIN_TOKEN na Vercel", configured: configured() }, 503);
  if (!sameToken(token, expected)) return json({ error: "unauthorized" }, 401);

  let body: { id?: unknown; action?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (body.action === "verify") return json({ ok: true, configured: configured() });
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action === "approve" || body.action === "discard" ? body.action : null;
  if (!ID.test(id) || !action) return json({ error: "id ou action inválido" }, 400);
  if (!process.env.LAB_GITHUB_TOKEN)
    return json({ error: "configure LAB_GITHUB_TOKEN na Vercel", configured: configured() }, 503);
  /* Uma linha, sem quebra nem crase: vai pro log em markdown e pra mensagem do commit. */
  const reason = typeof body.reason === "string" ? body.reason.replace(/[\s`]+/g, " ").trim().slice(0, 300) : "";

  for (let attempt = 0; ; attempt++) {
    try {
      const commitSha = await verdict(id, action, reason);
      return json({ ok: true, id, action, commit: commitSha });
    } catch (e) {
      const status = (e as { status?: number }).status ?? 500;
      /* 422 no PATCH do ref = a main andou no meio; relê e tenta de novo uma vez. */
      if (status === 422 && attempt === 0) continue;
      const code = status === 404 ? 404 : status === 409 ? 409 : 502;
      return json({ error: (e as Error).message }, code);
    }
  }
}
