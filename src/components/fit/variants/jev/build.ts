// The Jev mock-up's sheets, from the real answers in answers.json. Throwaway.
//
// Jev answers 13 criteria on the whole posting, and for each sentence whether it supports a
// yes to each. A sentence is marked for a criterion only when the posting-level answer is yes
// too, so a mark never contradicts the score. Code turns the answers into a 1-5 fit (rule.ts,
// copied from job-radar) and the fit into the band's verdict. Haiku, sent at the same time,
// gives the location and settles any criterion Jev left between 0.3 and 0.7.
import { LOCATION_COPY, VERDICT_COPY, type Verdict } from '../../../../fit/copy';
import type { FitAssessment } from '../../../../fit/schema';
import { escapeHtml, LOCATION_TONE, PIN, placedSheetHtml, resultSheetHtml, SIDE_LABEL, VERDICT_TONE, type PlacedMark, type Tone } from '../../result';
import data from './answers.json';
import extraData from './extra-answers.json';
import { EXTRA_COPY, EXTRA_IDS, TS_REACT, type ExtraId } from './extra';
import { CRITERION_IDS, type Answers, type CriterionId } from './criteria';
import { CRITERION_COPY } from './copy';
import { fitFromAnswers, fitFromNouls, fitRange } from './rule';
import type { Sentence } from './sentences';

const YES = 0.7;
const NO = 0.3;
/** A sentence counts as support at this or above, once the posting-level answer is yes. */
const SENTENCE = 0.5;

interface Posting {
  title: string;
  company: string;
  text: string;
  sentences: Sentence[];
  jev: { posting: Record<CriterionId, number>; sentences: Record<string, Partial<Record<CriterionId, number>>>; questions: number; requests: number; ms: number; costUsd: number };
  haiku: { criteria: Record<CriterionId, boolean>; check: FitAssessment | null; ms: number };
}

export type PostingId = keyof typeof data.postings;
const postings = data.postings as unknown as Record<PostingId, Posting>;

type ExtraKey = ExtraId | 'typescript_react';
const EXTRA_KEYS: ExtraKey[] = ['typescript_react', ...EXTRA_IDS];
const extras = extraData as unknown as Record<string, { posting: Record<ExtraKey, number>; sentences: Record<string, Partial<Record<ExtraId, number>>> }>;

/** The "for" criteria a sentence backs, when the posting-level answer is yes too. */
function extraHits(id: PostingId, s: Sentence): ExtraKey[] {
  const e = extras[id];
  if (!e) return [];
  return EXTRA_KEYS.filter((k) =>
    k === 'typescript_react' ? TS_REACT.test(s.text) : e.posting[k] >= YES && (e.sentences[s.id]?.[k] ?? 0) >= SENTENCE,
  );
}

const verdictOf = (fit: number): Verdict => (fit >= 4 ? 'strong' : fit === 3 ? 'possible' : 'poor');

const STATUS: Record<Verdict, string> = {
  strong: '<circle cx="7" cy="7" r="5.25" class="fill"/>',
  possible: '<circle cx="7" cy="7" r="5.25"/><path d="M7 1.75a5.25 5.25 0 0 1 0 10.5Z" class="fill"/>',
  poor: '<circle cx="7" cy="7" r="5.25"/>',
};

function chip(v: Verdict, label = VERDICT_COPY[v].label) {
  return `<p class="chip" data-tone="${VERDICT_TONE[v]}"><svg viewBox="0 0 14 14" aria-hidden="true">${STATUS[v]}</svg>${escapeHtml(label)}</p>`;
}

/**
 * Each marked sentence, tinted by the way its criteria pull. The first sentence for a set of
 * criteria carries the note, with how many sentences share it; the rest are tint alone.
 */
function sentenceMarks(p: Posting, id: PostingId, withExtra: boolean): PlacedMark[] {
  type Hit = CriterionId | ExtraKey;
  const found: Array<{ s: Sentence; hits: Hit[] }> = [];
  for (const s of p.sentences) {
    if (s.heading) continue;
    const hits: Hit[] = CRITERION_IDS.filter((c) => p.jev.posting[c] >= YES && (p.jev.sentences[s.id]?.[c] ?? 0) >= SENTENCE);
    if (withExtra) hits.push(...extraHits(id, s));
    if (hits.length) found.push({ s, hits });
  }
  const info = (h: Hit) => (h in CRITERION_COPY ? CRITERION_COPY[h as CriterionId] : EXTRA_COPY[h as ExtraKey]);
  const key = (h: Hit[]) => h.join('+');
  const count = new Map<string, number>();
  for (const f of found) count.set(key(f.hits), (count.get(key(f.hits)) ?? 0) + 1);
  const noted = new Set<string>();
  return found.map(({ s, hits }) => {
    const pulls = new Set(hits.map((c) => info(c).pull));
    const tone: Tone = pulls.size === 1 ? [...pulls][0] : 'mixed';
    const n = count.get(key(hits))!;
    const quiet = noted.has(key(hits));
    noted.add(key(hits));
    const names = hits.map((c) => info(c).short).join(' · ');
    return {
      from: s.from,
      to: s.to,
      note: { kind: 'reason' as const, tone, label: SIDE_LABEL[tone as 'for'], copy: n > 1 ? `${names}, in ${n} sentences` : names, quiet },
    };
  });
}

function locationMark(p: Posting, taken: PlacedMark[]): { mark?: PlacedMark; loose?: PlacedMark['note'] } {
  const loc = p.haiku.check?.location;
  if (!loc) return {};
  const note = { kind: 'location' as const, tone: LOCATION_TONE[loc.verdict], label: 'Location', copy: LOCATION_COPY[loc.verdict] };
  const at = loc.quote ? p.text.indexOf(loc.quote) : -1;
  if (at === -1) return { loose: note };
  const span = { from: at, to: at + loc.quote!.length };
  if (taken.some((m) => span.from < m.to && m.from < span.to)) return { loose: note };
  return { mark: { ...span, note } };
}

/** The criteria as a list: the yeses, the unsettled, then how many noes. */
function criteriaHtml(p: Posting, id: PostingId, stage: 'jev' | 'joined', withExtra: boolean): string {
  const rows: string[] = [];
  let no = 0;
  for (const c of CRITERION_IDS) {
    const prob = p.jev.posting[c];
    const { short, pull } = CRITERION_COPY[c];
    const pct = `<span class="p">${prob.toFixed(2)}</span>`;
    if (prob >= YES) rows.push(`<li data-tone="${pull}"><span class="dot"></span>${escapeHtml(short)}${pct}</li>`);
    else if (prob > NO) {
      const settled =
        stage === 'joined'
          ? `<em>${p.haiku.criteria[c] ? 'yes' : 'no'}, says Haiku</em>`
          : `<em class="asking">asking Haiku…</em>`;
      rows.push(`<li data-open${stage === 'joined' && p.haiku.criteria[c] ? ` data-tone="${pull}"` : ''}><span class="dot"></span>${escapeHtml(short)}${pct}${settled}</li>`);
    } else no++;
  }
  if (no) rows.push(`<li class="rest">${no} more: no</li>`);
  const e = extras[id];
  if (withExtra && e) {
    const yes = EXTRA_KEYS.filter((k) => e.posting[k] >= YES);
    const rest = EXTRA_KEYS.length - yes.length;
    rows.push(
      `<li class="break"></li>` +
        yes.map((k) => `<li data-tone="for"><span class="dot"></span>${escapeHtml(EXTRA_COPY[k].short)}<span class="p">${k === 'typescript_react' ? 'code' : e.posting[k].toFixed(2)}</span></li>`).join('') +
        (rest ? `<li class="rest">${rest} more: no</li>` : ''),
    );
  }
  return `<div class="crit"><p class="crit-head">${CRITERION_IDS.length} questions on the posting</p><ul>${rows.join('')}</ul></div>`;
}

export function jevSheets(id: PostingId, withExtra = false) {
  const p = postings[id];
  const label = `${p.title}, ${p.company}`;
  const nouls = fitFromNouls(p.jev.posting, { yes: YES, no: NO });
  const read = Object.fromEntries(CRITERION_IDS.map((c) => [c, p.jev.posting[c] >= 0.5])) as Answers;
  const settledByHaiku = { ...read };
  for (const c of nouls.unsettled) settledByHaiku[c] = p.haiku.criteria[c];
  const finalFit = fitFromAnswers(settledByHaiku);
  const range = fitRange(read, nouls.unsettled);

  const marks = sentenceMarks(p, id, withExtra);
  const loc = locationMark(p, marks);

  // Stage one: Jev's answers alone
  const open = nouls.unsettled.length > 0;
  const lo = verdictOf(range.min);
  const hi = verdictOf(range.max);
  const jevVerdict = open && lo !== hi ? `${VERDICT_COPY[lo].label.replace(' match', '')} or ${VERDICT_COPY[hi].label.toLowerCase()}` : VERDICT_COPY[verdictOf(nouls.fit)].label;
  const jevTop =
    `<div class="verdict">${chip(open ? lo : verdictOf(nouls.fit), jevVerdict)}` +
    `<p class="v-line">${open ? `Fit ${range.min} to ${range.max} of 5: ${nouls.unsettled.length === 1 ? 'one question is' : `${nouls.unsettled.length} questions are`} still open.` : `Fit ${nouls.fit} of 5, worked out in code from the answers.`}</p></div>` +
    `<div class="note pending" data-kind="location"><p>${PIN} Location: Haiku is reading it…</p></div>`;
  const jev = placedSheetHtml(p.text, marks, jevTop, { label });

  // Stage two: Haiku has settled the open questions and read the location
  const fv = verdictOf(finalFit);
  const joinedTop =
    `<div class="verdict">${chip(fv)}<p class="v-line">Fit ${finalFit} of 5, worked out in code from the answers.</p></div>`;
  const joined = placedSheetHtml(p.text, loc.mark ? [...marks, loc.mark] : marks, joinedTop, { label, ...(loc.loose ? { loose: [loc.loose] } : {}) });

  // Today's band on the same posting: Haiku's verdict, reasons and quotes
  const today = p.haiku.check ? resultSheetHtml(p.text, p.haiku.check, { label }) : '';

  return {
    today,
    jev,
    joined,
    critJev: criteriaHtml(p, id, 'jev', withExtra),
    critJoined: criteriaHtml(p, id, 'joined', withExtra),
    facts: {
      sentences: p.sentences.filter((s) => !s.heading).length,
      marked: marks.length,
      questions: p.jev.questions,
      jevMs: p.jev.ms,
      haikuMs: p.haiku.ms,
      costUsd: p.jev.costUsd,
      todayVerdict: p.haiku.check ? VERDICT_COPY[p.haiku.check.verdict].label : null,
      finalVerdict: VERDICT_COPY[fv].label,
      finalFit,
    },
  };
}

export const RAN = { model: data.model, haiku: data.haiku, at: data.ranAt };
