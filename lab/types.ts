/**
 * The contract every lab experiment exports.
 *
 * One file = one experiment = `export const meta` + `export default` component.
 * The page discovers files by glob, so a daily run only ADDS a file: no index to
 * edit, no registry entry, nothing else to keep in sync. `npm run lab:check`
 * validates this shape (and the rules in RULES.md) before anything is committed.
 */

import type { ReactElement } from "react";

export type LabStatus = "candidate" | "kept";

export interface LabMeta {
  /** `<yyyy-mm-dd>-<slug>`, identical to the file name. */
  id: string;
  /** `yyyy-mm-dd`, the day the generator made it. */
  date: string;
  title: string;
  /** Mono bracket label, top-left of the card: `[ LEVEL ]`. One word. */
  label: string;
  /** Tiny instruction, top-right: the single gesture, in plain words. */
  hint: string;
  /** The math behind it, one mono line at the bottom of the card. */
  formula: string;
  /** Rule ids from lab/RULES.md that this experiment follows. */
  rules: string[];
  status: LabStatus;
}

export interface LabModule {
  meta: LabMeta;
  default: () => ReactElement;
}
