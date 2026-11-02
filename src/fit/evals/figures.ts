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

function agreementLine(a: AgreementResults): string {
  const v = a.verdict;
  const caveat = a.positives < FEW_POSITIVES ? `; with only ${a.positives} of those, that figure is rough` : '';
  const yes = v.fitWereKeepOrMaybe;
  return (
    `Checked against ${a.n} postings I’d labelled myself in job-radar: I’d skipped ${v.poorWereSkips.k} of the ${v.poorWereSkips.n} it called poor. ` +
    `It rated ${v.recallOfPositives.k} of the ${v.recallOfPositives.n} I’d kept or marked maybe as strong or possible${caveat}. ` +
    `Of its ${yes.n} strong or possible verdicts, ${yes.n - yes.k} went to postings I’d skipped.`
  );
}

function redTeamLine(r: RedTeamResults): string {
  const changed = r.verdictChanged.k === 0 ? 'no verdict changed' : `the verdict changed in ${count(r.verdictChanged.k, r.verdictChanged.n)}`;
  return ` With instructions to AI tools hidden in ${r.pairs} made-up postings, it flagged ${count(r.injectionFlagged.k, r.injectionFlagged.n)} and ${changed}.`;
}

export const EVAL_FIGURES = {
  agreement: agreementLine(AGREEMENT),
  redTeam: redTeamLine(RED_TEAM),
};
