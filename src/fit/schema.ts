import { LOCATIONS, REASON_CODES, REASONS, VERDICTS, type LocationVerdict, type ReasonCode, type Verdict } from './copy.ts';

// The only shape the model may return: enums, codes from a fixed list and quotes. Every
// quote is checked against the posting before anything is shown.

export interface Reason {
  code: ReasonCode;
  quote: string;
}

export interface FitAssessment {
  verdict: Verdict;
  reasons: Reason[];
  location: { verdict: LocationVerdict; quote: string | null };
  injection: { present: boolean; quote: string | null };
}

export const MIN_REASONS = 2;
export const MAX_REASONS = 3;
/** Long enough for a sentence; longer quotes make the reply heavy and the evidence vague. */
export const MAX_QUOTE_CHARS = 300;

const quoteOrNull = { anyOf: [{ type: 'string' }, { type: 'null' }] };

/** Sent as the structured-output format. Counts and quote checks the API can't express live in `validateAssessment`. */
export const assessmentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'reasons', 'location', 'injection'],
  properties: {
    verdict: { type: 'string', enum: [...VERDICTS] },
    reasons: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'quote'],
        properties: { code: { type: 'string', enum: [...REASON_CODES] }, quote: { type: 'string' } },
      },
    },
    location: {
      type: 'object',
      additionalProperties: false,
      required: ['verdict', 'quote'],
      properties: { verdict: { type: 'string', enum: [...LOCATIONS] }, quote: quoteOrNull },
    },
    injection: {
      type: 'object',
      additionalProperties: false,
      required: ['present', 'quote'],
      properties: { present: { type: 'boolean' }, quote: quoteOrNull },
    },
  },
} as const;

/**
 * For the quote check only: unify typographic quotes and dashes, case and whitespace, so a
 * quote still matches when the model straightens an apostrophe or joins two lines. What's
 * shown is the model's quote as given, which is the visitor's own text.
 */
export function normaliseForQuote(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u2033]/g, '"')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, '')
    // List markers at the start of a line, so a quote that runs from a heading into its first bullet still matches
    .replace(/(^|\n)[ \t]*[-*\u2022\u00b7][ \t]+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripWrapping(q: string): string {
  return q.trim().replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, '').trim();
}

/**
 * A quote counts if, normalised, it appears in the posting and has some substance: at least
 * four characters including a letter, so "a" or "..." can't match everything.
 */
export function isVerbatimQuote(quote: string, source: string): boolean {
  const q = normaliseForQuote(stripWrapping(quote));
  if (q.length < 4 || !/\p{L}/u.test(q)) return false;
  return normaliseForQuote(source).includes(q);
}

export type Validation = { ok: true; value: FitAssessment } | { ok: false; problems: string[] };

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Check parsed model output against the schema, plus what JSON schema can't say: two or
 * three distinct reasons, every quote verbatim from the posting, a quote wherever a value
 * claims something, and a verdict its reasons can support.
 */
export function validateAssessment(raw: unknown, source: string): Validation {
  if (!isObject(raw)) return { ok: false, problems: ['output is not a JSON object'] };
  const problems: string[] = [];

  const quote = (name: string, q: unknown, required: boolean) => {
    if (q === null) {
      if (required) problems.push(`${name}: a quote is required`);
      return;
    }
    if (typeof q !== 'string') return problems.push(`${name}: expected a string or null`);
    if (q.length > MAX_QUOTE_CHARS) return problems.push(`${name}: quote is longer than ${MAX_QUOTE_CHARS} characters`);
    if (!isVerbatimQuote(q, source)) problems.push(`${name}: not a verbatim quote from the posting: ${JSON.stringify(q.slice(0, 120))}`);
  };

  const verdict = raw.verdict;
  if (!VERDICTS.includes(verdict as Verdict)) problems.push(`verdict: expected ${VERDICTS.join('|')}`);

  const reasons = raw.reasons;
  if (!Array.isArray(reasons) || reasons.length < MIN_REASONS || reasons.length > MAX_REASONS) {
    problems.push(`reasons: expected ${MIN_REASONS} to ${MAX_REASONS}`);
  } else {
    const seen = new Set<string>();
    reasons.forEach((r, i) => {
      if (!isObject(r)) return problems.push(`reasons[${i}]: expected an object`);
      if (!REASON_CODES.includes(r.code as ReasonCode)) problems.push(`reasons[${i}].code: not a known reason code`);
      else if (seen.has(r.code as string)) problems.push(`reasons[${i}].code: ${r.code} given twice`);
      seen.add(r.code as string);
      quote(`reasons[${i}].quote`, r.quote, true);
    });
    // A strong fit needs a reason for it, and a poor fit a reason against
    const sides = reasons.filter(isObject).map((r) => REASONS[r.code as ReasonCode]?.side);
    if (verdict === 'strong' && !sides.includes('for')) problems.push('reasons: a strong fit needs at least one reason for it');
    if (verdict === 'poor' && !sides.includes('against') && !sides.includes('mixed')) {
      problems.push('reasons: a poor fit needs at least one reason against it');
    }
  }

  const location = raw.location;
  if (!isObject(location) || !LOCATIONS.includes(location.verdict as LocationVerdict)) {
    problems.push(`location.verdict: expected ${LOCATIONS.join('|')}`);
  } else {
    quote('location.quote', location.quote ?? null, location.verdict !== 'unclear');
  }

  const injection = raw.injection;
  if (!isObject(injection) || typeof injection.present !== 'boolean') {
    problems.push('injection.present: expected true or false');
  } else if (injection.present) {
    quote('injection.quote', injection.quote ?? null, true);
  } else if (injection.quote !== null && injection.quote !== undefined) {
    problems.push('injection.quote: must be null when nothing is present');
  }

  const extra = Object.keys(raw).filter((k) => !(k in assessmentJsonSchema.properties));
  if (extra.length) problems.push(`unexpected fields: ${extra.join(', ')}`);

  if (problems.length) return { ok: false, problems };
  // Rebuild rather than pass the object through, so nothing unexpected rides along
  const r = raw as unknown as FitAssessment;
  return {
    ok: true,
    value: {
      verdict: r.verdict,
      reasons: r.reasons.map(({ code, quote: q }) => ({ code, quote: q })),
      location: { verdict: r.location.verdict, quote: r.location.quote ?? null },
      injection: { present: r.injection.present, quote: r.injection.present ? r.injection.quote : null },
    },
  };
}
