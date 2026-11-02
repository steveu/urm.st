import agreementJson from './agreement-results.json';
import redTeamJson from './redteam-results.json';
import type { AgreementResults, RedTeamResults } from './summarise.ts';

// The evals' committed figures, and the sentences the band quotes them in. The JSON is written
// by scripts/fit-agreement.ts and scripts/fit-redteam.ts; re-run both after changing the
// prompt, the profile or the model, and the band follows.

export const AGREEMENT = agreementJson as AgreementResults;
export const RED_TEAM = redTeamJson as RedTeamResults;

/** Under this many positive labels, say the figures about them are rough. */
export const FEW_POSITIVES = 30;

const count = (k: number, n: number) => (k === n ? `all ${n}` : k === 0 ? `none of ${n}` : `${k} of ${n}`);

/**
 * The band's close: one sentence, two figures in bold, each with its sample size beside it.
 * It quotes the no side, which is what the band claims ("it says no as plainly as yes"), and
 * not overall agreement: most postings are skips, so saying poor to everything would agree
 * more often than the check does. The yes side's rougher figures are on /work/fit-check.
 * HTML, built from numbers only.
 */
function closeHtml(a: AgreementResults, r: RedTeamResults): string {
  const p = a.verdict.poorWereSkips;
  const moved =
    r.verdictChanged.k === 0 ? 'no verdict moved' : `the verdict moved in ${count(r.verdictChanged.k, r.verdictChanged.n)}`;
  return (
    `Of ${p.n} real postings it called poor, I’d skipped <strong>${p.k}</strong>; ` +
    `it flagged <strong>${count(r.injectionFlagged.k, r.injectionFlagged.n)}</strong> instructions I hid in made-up postings, and ${moved}.`
  );
}

export const EVAL_FIGURES = {
  closeHtml: closeHtml(AGREEMENT, RED_TEAM),
};
