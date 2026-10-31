/**
 * O veredito do lab, sem terminal e sem deploy: ui.visantlabs.com/api/lab
 *
 * A rodada diária publica cada experimento como `candidate` (o público não vê).
 * Um admin do Visant Labs abre /lab?admin, entra (`lab-login.ts`) e aprova ou
 * descarta. O veredito vai pro Supabase (`lab.veredictos`) e a página junta
 * isso em runtime: aprovado aparece pro público na hora, sem redeploy. A rodada
 * diária seguinte sincroniza o git (lab/RULES.md, "The run").
 *
 *   GET  /api/lab   → { login, store, admin, user, kept[], discarded[], veredictos[] }
 *   POST /api/lab   { id, action: "approve" | "discard", reason? }
 *        401 sem sessão de admin · 403 origem estranha · 503 store não configurado
 */

import { listVeredictos, loginReady, putVeredicto, session, storeReady } from "./_lab-auth.js";

const ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;

const json = (body: unknown, status = 200, headers = new Headers()) => {
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
};

export async function GET(request: Request) {
  const headers = new Headers();
  let admin = false;
  let user: string | null = null;
  if (loginReady()) {
    const s = await session(request, headers);
    admin = s.isAdmin === true;
    user = admin ? (s.user ?? null) : null;
  }
  /* O motivo é nota de gosto e vai pro PREFERENCES.md (repo público) de qualquer
     jeito; quem decidiu (`by`) não sai daqui. `pnpm lab:sync` lê esta lista. */
  let veredictos: { id: string; status: string; reason: string; at: string }[] = [];
  let store = storeReady();
  if (store) {
    try {
      veredictos = (await listVeredictos()).map(({ id, status, reason, at }) => ({ id, status, reason, at }));
    } catch {
      /* Store fora do ar: a página mostra só o que está no git, e `store: false` avisa. */
      store = false;
    }
  }
  const ids = (s: string) => veredictos.filter((v) => v.status === s).map((v) => v.id);
  return json(
    { login: loginReady(), store, admin, user, kept: ids("kept"), discarded: ids("discarded"), veredictos },
    200,
    headers,
  );
}

export async function POST(request: Request) {
  if (!loginReady()) return json({ error: "unauthorized" }, 401);
  const headers = new Headers();
  const s = await session(request, headers);
  if (s.isAdmin !== true) return json({ error: "unauthorized" }, 401, headers);
  /* Cookie é SameSite=Lax; a origem conferida é a segunda trava contra CSRF. */
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "origem recusada" }, 403, headers);
  if (!storeReady()) return json({ error: "store do lab não configurado" }, 503, headers);

  let body: { id?: unknown; action?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400, headers);
  }
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.action === "approve" ? "kept" : body.action === "discard" ? "discarded" : null;
  if (!ID.test(id) || !status) return json({ error: "id ou action inválido" }, 400, headers);
  /* Uma linha, sem quebra nem crase: vai pro PREFERENCES.md na sincronização. */
  const reason = typeof body.reason === "string" ? body.reason.replace(/[\s`]+/g, " ").trim().slice(0, 300) : "";

  try {
    const v = await putVeredicto(id, status, reason, s.user ?? "admin");
    return json({ ok: true, ...v }, 200, headers);
  } catch (e) {
    return json({ error: (e as Error).message }, 502, headers);
  }
}
