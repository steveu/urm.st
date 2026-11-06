// The aligned mock-up: Haiku decides, Jev reads and checks, on one vocabulary (the site's
// reason list). Two stages from real answers (aligned-answers.json). Throwaway.
//
// 1. Jev's read, about half a second in: every sentence that backs a reason Jev says yes to is
//    underlined, dotted, in that reason's colour. No notes yet.
// 2. Haiku's verdict, about two seconds in: the verdict, its two or three reasons at their
//    quotes in full tint, each tagged with whether Jev agrees. Jev's other sentences stay underlined,
//    and the reasons only Jev found are named once under the verdict.
import { REASONS, VERDICT_COPY, LOCATION_COPY, type ReasonCode, type Side, type Verdict } from '../../../../fit/copy';
import type { FitAssessment } from '../../../../fit/schema';
import { escapeHtml, LOCATION_TONE, placedSheetHtml, resultSheetHtml, SIDE_LABEL, VERDICT_TONE, type PlacedMark, type Tone } from '../../result';
import data from './aligned-answers.json';
import type { Sentence } from './sentences';

const YES = 0.7;
const NO = 0.3;
const SENTENCE = 0.5;

/** Short names for the reasons, for the line under the verdict. */
export const SHORT: Record<ReasonCode, string> = {
  ai_product_end_to_end: 'AI features end to end',
  owns_agent: 'Owns an AI agent',
  evals_in_scope: 'Evals in scope',
  frontend_design_systems: 'Frontend craft',
  typescript_react: 'TypeScript and React',
  hands_on_product: 'Hands-on product role',
  early_ownership: 'Early ownership',
  senior_hands_on: 'Senior and hands-on',
  ai_leans_platform: 'AI platform work',
  frontend_without_ai: 'Frontend, no AI',
  specialism_gap: 'Specialism gap',
  backend_leaning: 'Mainly backend',
  ml_or_data_science: 'ML or data science',
  customer_delivery: 'Customer delivery',
  internal_tooling: 'Internal tools',
  architecture_or_management: 'Architecture or management',
  agency_delivery: 'Agency work',
  ai_tools_only: 'AI coding tools only',
  junior_level: 'Junior or mid-level',
  unrelated_role: 'Another discipline',
};

interface Posting {
  title: string;
  company: string;
  text: string;
  sentences: Sentence[];
  jev: { posting: Record<ReasonCode, number>; sentences: Record<string, Partial<Record<ReasonCode, number>>>; ms: number; questions: number };
  haiku: { check: FitAssessment | null; ms: number };
}
export type AlignedId = keyof typeof data.postings;
const postings = data.postings as unknown as Record<AlignedId, Posting>;
const CODES = Object.keys(REASONS) as ReasonCode[];

const STATUS: Record<Verdict, string> = {
  strong: '<circle cx="7" cy="7" r="5.25" class="fill"/>',
  possible: '<circle cx="7" cy="7" r="5.25"/><path d="M7 1.75a5.25 5.25 0 0 1 0 10.5Z" class="fill"/>',
  poor: '<circle cx="7" cy="7" r="5.25"/>',
};
const SPINNER =
  '<svg viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.25" class="track"/><path d="M7 1.75a5.25 5.25 0 0 1 5.25 5.25"/></svg>';

const toneOf = (codes: ReasonCode[]): Tone => {
  const sides = new Set<Side>(codes.map((c) => REASONS[c].side));
  return sides.size === 1 ? [...sides][0] : 'mixed';
};

/** Sentences Jev says back a reason it also says yes to, for the whole posting. */
function jevSentences(p: Posting): Array<{ s: Sentence; codes: ReasonCode[] }> {
  const out: Array<{ s: Sentence; codes: ReasonCode[] }> = [];
  for (const s of p.sentences) {
    if (s.heading) continue;
    const codes = CODES.filter((c) => p.jev.posting[c] >= YES && (p.jev.sentences[s.id]?.[c] ?? 0) >= SENTENCE);
    if (codes.length) out.push({ s, codes });
  }
  return out;
}

const faint = (s: Sentence, codes: ReasonCode[]): PlacedMark => ({
  from: s.from,
  to: s.to,
  note: { kind: 'reason', tone: toneOf(codes), label: '', copy: '', quiet: true, faint: true },
});

function agreement(prob: number): { text: string; state: string } {
  if (prob >= YES) return { text: `Jev agrees · ${prob.toFixed(2)}`, state: 'agree' };
  if (prob <= NO) return { text: `Jev didn’t find this · ${prob.toFixed(2)}`, state: 'disagree' };
  return { text: `Jev isn’t sure · ${prob.toFixed(2)}`, state: 'unsure' };
}

export function alignedSheets(id: AlignedId) {
  const p = postings[id];
  const label = `${p.title}, ${p.company}`;
  const found = jevSentences(p);
  const jevYes = CODES.filter((c) => p.jev.posting[c] >= YES);

  // Stage one: Jev's read, faint and wordless; the margin holds the verdict's place
  const readTop =
    `<div class="verdict reading"><p class="chip wait">${SPINNER}<span>Haiku is deciding…</span></p>` +
    `<p class="v-line">Jev has read all ${p.sentences.filter((s) => !s.heading).length} sentences: ${found.length} back ${jevYes.length} of the ${CODES.length} reasons.</p></div>`;
  const read = placedSheetHtml(p.text, found.map((f) => faint(f.s, f.codes)), readTop, { label });

  // Stage two: Haiku's verdict and reasons, each checked against Jev
  const a = p.haiku.check;
  if (!a) return { today: '', read, decided: '', facts: null };
  const marks: PlacedMark[] = [];
  for (const r of a.reasons) {
    const at = p.text.indexOf(r.quote);
    if (at === -1) continue;
    const side = REASONS[r.code].side;
    marks.push({
      from: at,
      to: at + r.quote.length,
      note: { kind: 'reason', tone: side, label: SIDE_LABEL[side], copy: REASONS[r.code].copy, aside: agreement(p.jev.posting[r.code] ?? 0) },
    });
  }
  const loc = a.location;
  const locAt = loc.quote ? p.text.indexOf(loc.quote) : -1;
  const locNote = { kind: 'location' as const, tone: LOCATION_TONE[loc.verdict], label: 'Location', copy: LOCATION_COPY[loc.verdict] };
  if (locAt !== -1) marks.push({ from: locAt, to: locAt + loc.quote!.length, note: locNote });
  const overlaps = (s: Sentence) => marks.some((m) => s.from < m.to && m.from < s.to);
  const quietMarks = found.filter((f) => !overlaps(f.s)).map((f) => faint(f.s, f.codes));

  const picked = new Set(a.reasons.map((r) => r.code));
  const also = jevYes.filter((c) => !picked.has(c));
  const v = VERDICT_COPY[a.verdict];
  const decidedTop =
    `<div class="verdict"><p class="chip" data-tone="${VERDICT_TONE[a.verdict]}"><svg viewBox="0 0 14 14" aria-hidden="true">${STATUS[a.verdict]}</svg>${escapeHtml(v.label)}</p>` +
    `<p class="v-line">${escapeHtml(v.line)}</p>` +
    (also.length ? `<p class="also"><span>Jev also found</span> ${also.map((c) => `<i data-tone="${REASONS[c].side}">${escapeHtml(SHORT[c])}</i>`).join('')}</p>` : '') +
    `</div>`;
  const decided = placedSheetHtml(p.text, [...marks, ...quietMarks], decidedTop, { label, ...(locAt === -1 ? { loose: [locNote] } : {}) });

  const agreed = a.reasons.filter((r) => (p.jev.posting[r.code] ?? 0) >= YES).length;
  return {
    today: resultSheetHtml(p.text, a, { label }),
    read,
    decided,
    facts: {
      jevMs: p.jev.ms,
      haikuMs: p.haiku.ms,
      questions: p.jev.questions,
      sentences: p.sentences.filter((s) => !s.heading).length,
      found: found.length,
      agreed,
      reasons: a.reasons.length,
      verdict: v.label,
    },
  };
}
