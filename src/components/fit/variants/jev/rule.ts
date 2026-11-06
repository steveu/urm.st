// Copied from job-radar's jev-criteria branch (a9e5606), src/eval/criteria/rule.ts, for the
// Jev mock-up only. Throwaway.

import { CRITERION_IDS, type Answers, type CriterionId } from './criteria.ts';

/**
 * Turn criterion answers into a 1-5 fit, following the scoring profile:
 * unrelated work and explicit juniority are a 1, the poor-fit categories a 2,
 * then ownership and AI work decide the rest. Seniority wording caps the result.
 */
export function fitFromAnswers(a: Answers): number {
  if (a.off_discipline || a.explicitly_junior) return 1;
  const ownsAgent = a.owns_user_facing && a.role_ai_work;
  if (a.backend_or_data || a.customer_delivery || a.agency || a.people_management || (a.internal_tooling && !ownsAgent)) return 2;

  let fit: number;
  if (a.product_role) fit = a.role_ai_work ? 4 : 3;
  else if (a.owns_user_facing) fit = a.role_ai_work ? 5 : a.product_is_ai ? 4 : 3;
  else fit = a.role_ai_work ? 3 : 2;

  if (a.stated_mid_level) fit = Math.min(fit, 3);
  // Unstated seniority with junior wording: ownership makes it a drawback, its absence a fail.
  if (a.junior_signals) fit = Math.min(fit, a.owns_user_facing ? 4 : 2);
  return fit;
}

export interface Thresholds {
  /** At or above: yes. */
  yes: number;
  /** At or below: no. Between the two is unsettled. */
  no: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { yes: 0.7, no: 0.3 };

export interface ProbabilisticFit {
  /** The fit with every answer read at 0.5. */
  fit: number;
  /** Lowest and highest fit over every reading of the unsettled answers. */
  min: number;
  max: number;
  unsettled: CriterionId[];
}

/**
 * Score Noul probabilities. An answer between the thresholds is unsettled:
 * the fit is reported at 0.5, with the range it could take either way, so
 * code can tell a settled 3 from one that hangs on a coin toss.
 */
export function fitFromNouls(p: Record<CriterionId, number>, t: Thresholds = DEFAULT_THRESHOLDS): ProbabilisticFit {
  const read = Object.fromEntries(CRITERION_IDS.map((id) => [id, p[id] >= 0.5])) as Answers;
  const unsettled = CRITERION_IDS.filter((id) => p[id] > t.no && p[id] < t.yes);
  const { min, max } = fitRange(read, unsettled);
  return { fit: fitFromAnswers(read), min, max, unsettled };
}

/** Fit over every true/false reading of the open criteria. */
export function fitRange(base: Answers, open: CriterionId[]): { min: number; max: number } {
  let min = 5;
  let max = 1;
  for (let mask = 0; mask < 1 << open.length; mask++) {
    const a = { ...base };
    open.forEach((id, i) => (a[id] = Boolean(mask & (1 << i))));
    const f = fitFromAnswers(a);
    min = Math.min(min, f);
    max = Math.max(max, f);
  }
  return { min, max };
}
