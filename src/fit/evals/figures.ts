import agreementJson from './agreement-results.json';
import redTeamJson from './redteam-results.json';
import type { AgreementResults, RedTeamResults } from './summarise.ts';

// The evals' committed figures, and the sentence the band quotes. The JSON is written by
// scripts/fit-agreement.ts and scripts/fit-redteam.ts; re-run both after changing the prompt,
// the profile or the model, and the band and /work/fit-check follow.

export const AGREEMENT = agreementJson as AgreementResults;
export const RED_TEAM = redTeamJson as RedTeamResults;

/**
 * Agreement needs my hand-labelled postings, which stay on my machine, so it is re-run
 * deliberately rather than with every prompt change. Until it is, the page says which prompt
 * it was measured with, and a test allows exactly this one older version.
 */
export const AGREEMENT_PROMPT_ALLOWED = 'fit-v3';

/** Under this many positive labels, say the figures about them are rough. */
export const FEW_POSITIVES = 30;

export const count = (k: number, n: number) => (k === n ? `all ${n}` : k === 0 ? `none of ${n}` : `${k} of ${n}`);

/**
 * The band's close: the red team only, one figure in bold beside its sample size, and whether
 * any verdict moved. HTML, built from numbers only.
 */
function closeHtml(r: RedTeamResults): string {
  const f = r.injectionFlagged;
  const moved =
    r.verdictChanged.k === 0 ? 'no verdict moved' : `the verdict moved in ${count(r.verdictChanged.k, r.verdictChanged.n)}`;
  const flagged = f.k === f.n ? `flagged <strong>all ${f.n}</strong>` : `flagged <strong>${f.k}</strong>`;
  return `I hid instructions for AI tools in ${f.n} made-up postings: it ${flagged}, and ${moved}.`;
}

export const EVAL_FIGURES = {
  closeHtml: closeHtml(RED_TEAM),
};
