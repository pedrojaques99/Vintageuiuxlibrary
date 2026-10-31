/**
 * O veredito do lab, sem terminal: ui.visantlabs.com/api/lab
 *
 * A rodada diária publica cada experimento como `candidate` (invisível pro
 * público). O dono abre /lab?admin, entra com GitHub (`lab-login.ts`) e aprova
 * ou descarta; isto aqui faz o mesmo que `pnpm lab:keep` / `lab:discard`
 * (scripts/lab.mjs), como UM commit na `main` pela API Git do GitHub, feito
 * COM O TOKEN DE QUEM ENTROU (o commit sai no nome dele). O push na `main`
 * dispara o deploy de produção pela integração Git da Vercel: ~1–2 min.
 *
 *   GET  /api/lab   → { configured, login, canPush }        (lê o cookie da sessão)
 *   POST /api/lab   { id, action: "approve" | "discard", reason? }
 *        401 sem sessão · 403 sem push no repo (ou origem estranha)
 */

import { REPO, canPush, configured, gh, session } from "./_lab-auth.js";

const BRANCH = "main";
const ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;

const json = (body: unknown, status = 200, headers = new Headers()) => {
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
};

const decode = (b64: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

async function verdict(token: string, id: string, action: "approve" | "discard", reason: string) {
  const api = gh(token);
  const read = async (path: string) =>
    decode((await api<{ content: string }>(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`)).content);

  const file = `lab/experiments/${id}.tsx`;
  const src = await read(file);
  if (!/status:\s*"candidate"/.test(src)) throw Object.assign(new Error(`${id} não é candidate`), { status: 409 });
  const prefs = await read("lab/PREFERENCES.md");
  const day = new Date().toISOString().slice(0, 10);
  const why = reason || "(sem motivo)";
  const line = `- ${day} · ${action === "approve" ? "kept" : "discarded"} · \`${id}\` · ${why} · via /lab\n`;

  /* Um commit só (arquivo + PREFERENCES.md), pra sair um deploy só. */
  const ref = await api<{ object: { sha: string } }>(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const head = await api<{ tree: { sha: string } }>(`/repos/${REPO}/git/commits/${ref.object.sha}`);
  const tree = await api<{ sha: string }>(`/repos/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: head.tree.sha,
      tree: [
        action === "approve"
          ? { path: file, mode: "100644", type: "blob", content: src.replace(/status:\s*"candidate"/, 'status: "kept"') }
          : { path: file, mode: "100644", type: "blob", sha: null },
        { path: "lab/PREFERENCES.md", mode: "100644", type: "blob", content: prefs.replace(/\n*$/, "\n") + line },
      ],
    }),
  });
  const next = await api<{ sha: string }>(`/repos/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: `lab: ${action === "approve" ? "keep" : "discard"} ${id}\n\n${why}\n\nvia /lab admin`,
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  });
  await api(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: next.sha, force: false }),
  });
  return next.sha;
}

export async function GET(request: Request) {
  if (!configured()) return json({ configured: false, login: null, canPush: false });
  const headers = new Headers();
  const s = await session(request, headers);
  if (!s.token) return json({ configured: true, login: null, canPush: false }, 200, headers);
  return json({ configured: true, login: s.login ?? null, canPush: await canPush(s.token) }, 200, headers);
}

export async function POST(request: Request) {
  /* Sem login configurado não existe sessão possível: 401 como qualquer anônimo. */
  if (!configured()) return json({ error: "unauthorized", detail: "login GitHub ainda não configurado" }, 401);
  const headers = new Headers();
  const s = await session(request, headers);
  if (!s.token) return json({ error: "unauthorized" }, 401, headers);
  /* Cookie é SameSite=Lax; a origem conferida é a segunda trava contra CSRF. */
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "origem recusada" }, 403, headers);
  if (!(await canPush(s.token))) return json({ error: `sem push em ${REPO}` }, 403, headers);

  let body: { id?: unknown; action?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400, headers);
  }
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action === "approve" || body.action === "discard" ? body.action : null;
  if (!ID.test(id) || !action) return json({ error: "id ou action inválido" }, 400, headers);
  /* Uma linha, sem quebra nem crase: vai pro log em markdown e pra mensagem do commit. */
  const reason = typeof body.reason === "string" ? body.reason.replace(/[\s`]+/g, " ").trim().slice(0, 300) : "";

  for (let attempt = 0; ; attempt++) {
    try {
      const commit = await verdict(s.token, id, action, reason);
      return json({ ok: true, id, action, commit }, 200, headers);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 500;
      /* 422 no PATCH do ref = a main andou no meio; relê e tenta de novo uma vez. */
      if (status === 422 && attempt === 0) continue;
      if (status === 401) return json({ error: "sessão do GitHub expirou, entre de novo" }, 401, headers);
      return json({ error: (e as Error).message }, status === 404 || status === 409 ? status : 502, headers);
    }
  }
}
