"use client";

/**
 * /lab: the interaction lab.
 *
 * One small card per experiment, generated daily by rules (`lab/RULES.md`) and
 * curated by hand (`lab/PREFERENCES.md`). The public sees only what was KEPT.
 * The daily run ships straight to production as `candidate`; the owner opens
 * `/lab?admin`, pastes the admin token once (localStorage), and approves or
 * discards each candidate here. `api/lab.ts` turns that into one commit on
 * `main`, and the Git deploy puts the verdict live in ~1–2 min.
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

const TOKEN_KEY = "visant-lab-admin-token";
const PENDING_KEY = "visant-lab-pending";
/** A pending verdict older than this is assumed to be live (or lost) and forgotten. */
const PENDING_TTL = 10 * 60 * 1000;

type Action = "approve" | "discard";
type Pending = Record<string, { action: Action; at: number }>;
type Configured = { admin: boolean; github: boolean };

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

function useAdmin() {
  const [token, setToken] = React.useState<string | null>(() => read<string | null>(TOKEN_KEY, null));
  const [asked] = React.useState(() => new URLSearchParams(window.location.search).has("admin"));
  const [configured, setConfigured] = React.useState<Configured | null>(null);
  const [pending, setPending] = React.useState<Pending>(() => {
    const all = read<Pending>(PENDING_KEY, {});
    return Object.fromEntries(Object.entries(all).filter(([, p]) => Date.now() - p.at < PENDING_TTL));
  });
  const on = asked || token !== null;

  React.useEffect(() => {
    if (!on) return;
    fetch("/api/lab")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { configured?: Configured } | null) => setConfigured(j?.configured ?? { admin: false, github: false }))
      .catch(() => setConfigured({ admin: false, github: false }));
  }, [on]);

  const save = (t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else localStorage.removeItem(TOKEN_KEY);
    setToken(t);
  };
  const mark = (id: string, action: Action) => {
    const next = { ...pending, [id]: { action, at: Date.now() } };
    localStorage.setItem(PENDING_KEY, JSON.stringify(next));
    setPending(next);
  };
  return { on, token, save, configured, pending, mark };
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

function TokenForm({ onSave }: { onSave: (t: string) => void | Promise<void> }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      className="mt-6 flex max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) void onSave(value.trim());
      }}
    >
      <input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="admin token"
        aria-label="Admin token"
        className={FIELD}
      />
      <button type="submit" disabled={!value.trim()} className={`${BUTTON} bg-casa-cta text-casa-cta-fg`}>
        Entrar
      </button>
    </form>
  );
}

function Verdict({
  id,
  token,
  configured,
  pending,
  onDone,
  onBadToken,
}: {
  id: string;
  token: string;
  configured: Configured | null;
  pending?: Action;
  onDone: (a: Action) => void;
  onBadToken: () => void;
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

  const missing = configured
    ? [!configured.admin && "LAB_ADMIN_TOKEN", !configured.github && "LAB_GITHUB_TOKEN"].filter(Boolean)
    : [];
  if (missing.length)
    return (
      <p className="mt-2 font-casa-mono text-casa-sm text-casa-fg-3">configure {missing.join(" / ")} na Vercel</p>
    );

  const send = async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action, reason }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) onBadToken();
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
          disabled={busy !== null || !configured}
          onClick={() => void send("approve")}
          className={`${BUTTON} bg-casa-cta text-casa-cta-fg`}
        >
          {busy === "approve" ? "aprovando…" : "Aprovar"}
        </button>
        <button
          type="button"
          disabled={busy !== null || !configured}
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

export function Lab() {
  const admin = useAdmin();
  const [badToken, setBadToken] = React.useState(false);
  const kept = EXPERIMENTS.filter((e) => e.meta.status === "kept");
  /* The public never renders a candidate: only an admin with a saved token does. */
  const candidates = admin.token ? EXPERIMENTS.filter((e) => e.meta.status === "candidate") : [];

  return (
    <main className="casa shell pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-casa-xl">Lab</h1>
          <p className="mt-2 text-casa-base text-casa-fg-2">
            A new interaction every day, generated from a short list of rules. Only the ones
            worth keeping stay, so the board drifts toward a taste over time.
          </p>
        </div>
        {admin.token ? (
          <button
            type="button"
            onClick={() => admin.save(null)}
            className="rounded-control font-casa-mono text-casa-sm text-casa-fg-3 hover:text-casa-fg"
          >
            admin · sair
          </button>
        ) : null}
      </div>

      {admin.on && (!admin.token || badToken) ? (
        <div>
          {badToken ? <p className="mt-6 font-casa-mono text-casa-sm text-casa-fg-3">token recusado</p> : null}
          <TokenForm
            onSave={async (t) => {
              /* 401 = wrong token. 503 = the server has no token yet: keep it, the cards say what to configure. */
              const res = await fetch("/api/lab", {
                method: "POST",
                headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
                body: JSON.stringify({ action: "verify" }),
              }).catch(() => null);
              setBadToken(res?.status === 401);
              if (res?.status !== 401) admin.save(t);
            }}
          />
        </div>
      ) : null}

      {admin.token && candidates.length ? (
        <section aria-label="Candidates" className="mt-8">
          <p className="font-casa-mono text-casa-sm text-casa-fg-2">[ CANDIDATES ] {candidates.length}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map(({ meta, default: Experiment }) => (
              <li key={meta.id}>
                <Card meta={meta} Experiment={Experiment} />
                <Verdict
                  id={meta.id}
                  token={admin.token as string}
                  configured={admin.configured}
                  pending={admin.pending[meta.id]?.action}
                  onDone={(a) => admin.mark(meta.id, a)}
                  onBadToken={() => setBadToken(true)}
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
