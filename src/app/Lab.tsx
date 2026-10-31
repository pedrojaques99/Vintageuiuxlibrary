"use client";

/**
 * /lab: the interaction lab.
 *
 * One small card per experiment, generated daily by rules (`lab/RULES.md`) and
 * curated by hand (`lab/PREFERENCES.md`). The public sees only what was KEPT.
 * The daily run ships straight to production as `candidate`; the owner opens
 * `/lab?admin`, signs in with GitHub (session in an HttpOnly cookie, see
 * `api/_lab-auth.ts`), and approves or discards each candidate here. `api/lab.ts`
 * commits the verdict to `main` as that user; the Git deploy puts it live in ~1–2 min.
 *
 * Experiments are discovered by glob, so adding one is adding a file. They live
 * outside `registry/` on purpose: nothing here is a published component, and
 * nothing here ships through `shadcn add` until the owner promotes it.
 */

import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { LabMeta, LabModule } from "../../lab/types";

const MODULES = import.meta.glob<LabModule>("../../lab/experiments/[0-9]*.tsx", { eager: true });

const EXPERIMENTS = Object.values(MODULES)
  .filter((m) => m.meta && typeof m.default === "function")
  .sort((a, b) => b.meta.id.localeCompare(a.meta.id));

const PENDING_KEY = "visant-lab-pending";
/** A pending verdict older than this is assumed to be live (or lost) and forgotten. */
const PENDING_TTL = 10 * 60 * 1000;

type Action = "approve" | "discard";
type Pending = Record<string, { action: Action; at: number }>;
/** What `GET /api/lab` says about the session cookie (HttpOnly: the page never sees the token). */
type Status = { configured: boolean; login: string | null; canPush: boolean };

const ERROS: Record<string, string> = {
  "login-nao-configurado": "login GitHub ainda não configurado",
  "login-expirou": "o login demorou demais, tente de novo",
  "login-falhou": "o GitHub recusou o login, tente de novo",
};

function readPending(): Pending {
  try {
    const all = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "{}") as Pending;
    return Object.fromEntries(Object.entries(all).filter(([, p]) => Date.now() - p.at < PENDING_TTL));
  } catch {
    return {};
  }
}

function useAdmin() {
  const [params] = React.useState(() => new URLSearchParams(window.location.search));
  const on = params.has("admin");
  const erro = params.get("erro");
  const [status, setStatus] = React.useState<Status | null>(null);
  const [pending, setPending] = React.useState<Pending>(readPending);

  React.useEffect(() => {
    if (!on) return;
    fetch("/api/lab", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .then((j) => setStatus(j ?? { configured: false, login: null, canPush: false }))
      .catch(() => setStatus({ configured: false, login: null, canPush: false }));
  }, [on]);

  const mark = (id: string, action: Action) => {
    const next = { ...pending, [id]: { action, at: Date.now() } };
    localStorage.setItem(PENDING_KEY, JSON.stringify(next));
    setPending(next);
  };
  return { on, erro: erro ? (ERROS[erro] ?? erro) : null, status, pending, mark };
}

function Card({ meta, Experiment }: { meta: LabMeta; Experiment: LabModule["default"] }) {
  return (
    <div className="flex aspect-square flex-col overflow-hidden rounded-tile bg-casa-tile p-4 [contain:paint] isolate">
      <div className="flex items-start justify-between gap-3 font-casa-mono text-casa-sm">
        <span className="shrink-0 text-casa-fg-2">[ {meta.label} ]</span>
        <span className="text-right text-casa-fg-3">{meta.hint}</span>
      </div>
      <div className="relative min-h-0 flex-1 py-3">
        <ErrorBoundary
          fallback={
            <p className="grid h-full place-items-center font-casa-mono text-casa-sm text-casa-fg-3">
              experiment crashed
            </p>
          }
        >
          <Experiment />
        </ErrorBoundary>
      </div>
      <div className="flex items-end justify-between gap-3 font-casa-mono text-casa-sm text-casa-fg-3">
        <span className="line-clamp-2 min-w-0" title={meta.formula}>
          {meta.formula}
        </span>
        {meta.status === "candidate" ? (
          <span className="shrink-0" title={meta.id}>
            candidate
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* Same field and button recipe as the rating form (`avaliacao.tsx`), in mono. */
const FIELD =
  "w-full min-w-0 rounded-control bg-casa-tile px-3 py-2 font-casa-mono text-casa-sm text-casa-fg outline-none placeholder:text-casa-fg-3 focus-visible:[box-shadow:var(--focus)]";
const BUTTON =
  "alvo-toque flex h-8 shrink-0 items-center rounded-control px-3 font-casa-mono text-casa-sm transition-opacity [transition-duration:var(--dur-fast)] hover:opacity-90 disabled:opacity-40 focus-visible:[box-shadow:var(--focus)]";

function Verdict({
  id,
  pending,
  onDone,
  onLoggedOut,
}: {
  id: string;
  pending?: Action;
  onDone: (a: Action) => void;
  onLoggedOut: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState<Action | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (pending)
    return (
      <p className="mt-2 font-casa-mono text-casa-sm text-casa-fg-2" role="status">
        {pending === "approve" ? "aprovado" : "descartado"} · publicando, ~1–2 min
      </p>
    );

  const send = async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      /* The session rides in the HttpOnly cookie; nothing secret lives in this page. */
      const res = await fetch("/api/lab", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action, reason }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) onLoggedOut();
      else if (!res.ok) setError(j.error ?? `erro ${res.status}`);
      else onDone(action);
    } catch {
      setError("sem rede");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="motivo (opcional)"
        aria-label={`Motivo para ${id}`}
        maxLength={300}
        className={FIELD}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void send("approve")}
          className={`${BUTTON} bg-casa-cta text-casa-cta-fg`}
        >
          {busy === "approve" ? "aprovando…" : "Aprovar"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void send("discard")}
          className={`${BUTTON} bg-casa-tile text-casa-fg-2`}
        >
          {busy === "discard" ? "descartando…" : "Descartar"}
        </button>
        {error ? <span className="min-w-0 font-casa-mono text-casa-sm text-casa-fg-3">{error}</span> : null}
      </div>
    </div>
  );
}

/** The admin strip under the title: login state in one mono line. */
function AdminBar({ status, erro, loggedOut }: { status: Status | null; erro: string | null; loggedOut: boolean }) {
  const note = (t: string) => <span className="text-casa-fg-3">{t}</span>;
  let body: React.ReactNode = note("…");
  if (status && !status.configured) body = note("login GitHub ainda não configurado");
  else if (status && (!status.login || loggedOut))
    body = (
      <a href="/api/lab-login" className={`${BUTTON} bg-casa-cta text-casa-cta-fg`}>
        Entrar com GitHub
      </a>
    );
  else if (status?.login)
    body = (
      <>
        <span className="text-casa-fg-2">@{status.login}</span>
        {status.canPush ? null : note("sem push no repo")}
        <a href="/api/lab-login?logout=1" className="rounded-control text-casa-fg-3 hover:text-casa-fg">
          sair
        </a>
      </>
    );
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 font-casa-mono text-casa-sm">
      {erro ? note(erro) : null}
      {body}
    </div>
  );
}

export function Lab() {
  const admin = useAdmin();
  const [loggedOut, setLoggedOut] = React.useState(false);
  const kept = EXPERIMENTS.filter((e) => e.meta.status === "kept");
  /* The public never renders a candidate: only a logged-in admin with push on the repo does. */
  const isAdmin = admin.on && Boolean(admin.status?.login && admin.status.canPush) && !loggedOut;
  const candidates = isAdmin ? EXPERIMENTS.filter((e) => e.meta.status === "candidate") : [];

  return (
    <main className="casa shell pb-24 pt-10">
      <div className="max-w-xl">
        <h1 className="text-casa-xl">Lab</h1>
        <p className="mt-2 text-casa-base text-casa-fg-2">
          A new interaction every day, generated from a short list of rules. Only the ones
          worth keeping stay, so the board drifts toward a taste over time.
        </p>
      </div>

      {admin.on ? <AdminBar status={admin.status} erro={admin.erro} loggedOut={loggedOut} /> : null}

      {candidates.length ? (
        <section aria-label="Candidates" className="mt-8">
          <p className="font-casa-mono text-casa-sm text-casa-fg-2">[ CANDIDATES ] {candidates.length}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map(({ meta, default: Experiment }) => (
              <li key={meta.id}>
                <Card meta={meta} Experiment={Experiment} />
                <Verdict
                  id={meta.id}
                  pending={admin.pending[meta.id]?.action}
                  onDone={(a) => admin.mark(meta.id, a)}
                  onLoggedOut={() => setLoggedOut(true)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {kept.length === 0 ? (
        <div className="mt-8 grid min-h-64 place-items-center rounded-tile bg-casa-tile p-8 text-center">
          <p className="text-casa-base text-casa-fg-2">Nothing kept yet. A new one is tried every day.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kept.map(({ meta, default: Experiment }) => (
            <li key={meta.id}>
              <Card meta={meta} Experiment={Experiment} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
