"use client";

/**
 * /lab: the interaction lab.
 *
 * One small card per experiment, generated daily by rules (`lab/RULES.md`) and
 * curated by hand (`lab/PREFERENCES.md`). The public sees only what was KEPT.
 * The daily run ships straight to production as `candidate`; a Visant Labs
 * admin opens `/lab?admin`, signs in ("Entrar com Visant Labs", session in an
 * HttpOnly cookie, see `api/_lab-auth.ts`) and approves or discards each
 * candidate here. Verdicts live in a small store (`api/lab.ts`) and are merged
 * at runtime, so an approval is public at once, no redeploy. The next daily run
 * writes them back into git.
 *
 * Experiments are discovered by glob, so adding one is adding a file. They live
 * outside `registry/` on purpose: nothing here is a published component, and
 * nothing here ships through `shadcn add` until the owner promotes it.
 */

import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { LabMeta, LabModule } from "../../lab/types";
import MOTIVOS from "../../lab/motivos.json";
import { Aba } from "./casa-ui";

const MODULES = import.meta.glob<LabModule>("../../lab/experiments/[0-9]*.tsx", { eager: true });

const EXPERIMENTS = Object.values(MODULES)
  .filter((m) => m.meta && typeof m.default === "function")
  .sort((a, b) => b.meta.id.localeCompare(a.meta.id));

type Action = "approve" | "discard";
/** `GET /api/lab`: verdicts from the store + who is signed in (the cookie itself is HttpOnly). */
type State = { login: boolean; store: boolean; admin: boolean; user: string | null; kept: string[]; discarded: string[] };

const ERROS: Record<string, string> = {
  "login-nao-configurado": "login Visant Labs ainda não configurado",
  "login-expirou": "o login demorou demais, tente de novo",
  "login-falhou": "o Visant Labs recusou o login, tente de novo",
  "nao-admin": "essa conta não é admin do Visant Labs",
};

function useLab() {
  const [params] = React.useState(() => new URLSearchParams(window.location.search));
  const [state, setState] = React.useState<State | null>(null);

  React.useEffect(() => {
    fetch("/api/lab", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<State>) : null))
      .then(setState)
      .catch(() => setState(null));
  }, []);

  /* The verdict is already public when the POST returns: reflect it right away. */
  const decide = (id: string, action: Action) =>
    setState((s) =>
      s && {
        ...s,
        kept: action === "approve" ? [...s.kept, id] : s.kept.filter((k) => k !== id),
        discarded: action === "discard" ? [...s.discarded, id] : s.discarded.filter((k) => k !== id),
      },
    );
  const erro = params.get("erro");
  return { on: params.has("admin"), erro: erro ? (ERROS[erro] ?? erro) : null, state, decide };
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

function Verdict({ id, onDone, onLoggedOut }: { id: string; onDone: (a: Action) => void; onLoggedOut: () => void }) {
  const [reason, setReason] = React.useState("");
  /* One-tap reasons (lab/motivos.json): what `pnpm lab:sync` counts per chip. */
  const [motivos, setMotivos] = React.useState<string[]>([]);
  const toggle = (m: string) => setMotivos((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const [busy, setBusy] = React.useState<Action | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const send = async (action: Action) => {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action, reason, motivos }),
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
      <div role="group" aria-label={`Motivos para ${id}`} className="flex flex-wrap gap-x-4 gap-y-1">
        {MOTIVOS.map((m) => (
          <Aba key={m} ativa={motivos.includes(m)} onClick={() => toggle(m)} className="font-casa-mono">
            {m}
          </Aba>
        ))}
      </div>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="mais algum motivo (opcional)"
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
function AdminBar({ state, erro, admin }: { state: State | null; erro: string | null; admin: boolean }) {
  const note = (t: string) => <span className="text-casa-fg-3">{t}</span>;
  let body: React.ReactNode = note("…");
  if (state && !state.login) body = note("login Visant Labs ainda não configurado");
  else if (state && !admin)
    body = (
      <a href="/api/lab-login" className={`${BUTTON} bg-casa-cta text-casa-cta-fg`}>
        Entrar com Visant Labs
      </a>
    );
  else if (state)
    body = (
      <>
        <span className="text-casa-fg-2">admin</span>
        {state.store ? null : note("store do lab não configurado")}
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
  const lab = useLab();
  const [loggedOut, setLoggedOut] = React.useState(false);
  const kept = new Set(lab.state?.kept);
  const decided = new Set([...(lab.state?.kept ?? []), ...(lab.state?.discarded ?? [])]);
  const isKept = (m: LabMeta) => kept.has(m.id) || (m.status === "kept" && !lab.state?.discarded.includes(m.id));
  const shown = EXPERIMENTS.filter((e) => isKept(e.meta));
  /* The public never renders a candidate: only a signed-in Visant Labs admin does. */
  const admin = lab.on && Boolean(lab.state?.admin) && !loggedOut;
  const candidates = admin
    ? EXPERIMENTS.filter((e) => e.meta.status === "candidate" && !decided.has(e.meta.id))
    : [];

  return (
    <main className="casa shell pb-24 pt-10">
      <div className="max-w-xl">
        <h1 className="text-casa-xl">Lab</h1>
        <p className="mt-2 text-casa-base text-casa-fg-2">
          A new interaction every day, generated from a short list of rules. Only the ones
          worth keeping stay, so the board drifts toward a taste over time.
        </p>
      </div>

      {lab.on ? <AdminBar state={lab.state} erro={lab.erro} admin={admin} /> : null}

      {candidates.length ? (
        <section aria-label="Candidates" className="mt-8">
          <p className="font-casa-mono text-casa-sm text-casa-fg-2">[ CANDIDATES ] {candidates.length}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map(({ meta, default: Experiment }) => (
              <li key={meta.id}>
                <Card meta={meta} Experiment={Experiment} />
                {meta.rationale ? (
                  <p className="mt-2 font-casa-mono text-casa-sm text-casa-fg-3" title="pnpm lab:next">
                    {meta.rationale}
                  </p>
                ) : null}
                <Verdict
                  id={meta.id}
                  onDone={(a) => lab.decide(meta.id, a)}
                  onLoggedOut={() => setLoggedOut(true)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shown.length === 0 ? (
        <div className="mt-8 grid min-h-64 place-items-center rounded-tile bg-casa-tile p-8 text-center">
          <p className="text-casa-base text-casa-fg-2">Nothing kept yet. A new one is tried every day.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ meta, default: Experiment }) => (
            <li key={meta.id}>
              <Card meta={{ ...meta, status: "kept" }} Experiment={Experiment} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
