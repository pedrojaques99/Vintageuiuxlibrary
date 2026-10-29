"use client";

/**
 * /lab: the interaction lab.
 *
 * One small card per experiment, generated daily by rules (`lab/RULES.md`) and
 * curated by hand (`lab/PREFERENCES.md`). The page shows what was KEPT; `?all=1`
 * (or the "All" tab) also shows the candidates still waiting for a verdict.
 *
 * Experiments are discovered by glob, so adding one is adding a file. They live
 * outside `registry/` on purpose: nothing here is a published component, and
 * nothing here ships through `shadcn add` until the owner promotes it.
 */

import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { LabModule } from "../../lab/types";
import { Aba } from "./casa-ui";

const MODULES = import.meta.glob<LabModule>("../../lab/experiments/[0-9]*.tsx", { eager: true });

const EXPERIMENTS = Object.values(MODULES)
  .filter((m) => m.meta && typeof m.default === "function")
  .sort((a, b) => b.meta.id.localeCompare(a.meta.id));

function useAll() {
  const [all, setAll] = React.useState(
    () => new URLSearchParams(window.location.search).get("all") === "1",
  );
  const change = React.useCallback((next: boolean) => {
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("all", "1");
    else url.searchParams.delete("all");
    window.history.replaceState(null, "", url);
    setAll(next);
  }, []);
  return [all, change] as const;
}

export function Lab() {
  const [all, setAll] = useAll();
  const kept = EXPERIMENTS.filter((e) => e.meta.status === "kept");
  const shown = all ? EXPERIMENTS : kept;

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
        <nav aria-label="Filter" className="flex items-center gap-5">
          <Aba ativa={!all} onClick={() => setAll(false)} count={kept.length}>
            Kept
          </Aba>
          <Aba ativa={all} onClick={() => setAll(true)} count={EXPERIMENTS.length}>
            All
          </Aba>
        </nav>
      </div>

      {shown.length === 0 ? (
        <div className="mt-8 grid min-h-64 place-items-center rounded-tile bg-casa-tile p-8 text-center">
          <p className="text-casa-base text-casa-fg-2">
            Nothing kept yet.{" "}
            <button
              type="button"
              onClick={() => setAll(true)}
              className="rounded-control text-casa-fg underline underline-offset-4"
            >
              See the {EXPERIMENTS.length} candidates
            </button>
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(({ meta, default: Experiment }) => (
            <li
              key={meta.id}
              className="flex aspect-square flex-col overflow-hidden rounded-tile bg-casa-tile p-4 [contain:paint] isolate"
            >
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
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
