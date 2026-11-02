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

interface Unit {
  c: string;
  /** Where the source character this came from starts and ends in the original text. */
  from: number;
  to: number;
}

/** Normalised text, with each UTF-16 unit's source range in the original. */
interface Mapped {
  text: string;
  from: number[];
  to: number[];
}

const isBlank = (c: string) => c === ' ' || c === '\t';
const isListMarker = (c: string) => /^[-*\u2022\u00b7]$/.test(c);

/**
 * For the quote check only: unify typographic quotes and dashes, case, whitespace, list
 * markers and zero-width characters. Each character keeps the range it came from, so a
 * tolerant match resolves to the exact passage of the original, and that is what's shown.
 */
function normaliseMapped(s: string): Mapped {
  // Character by character, so every output unit knows its source. NFKD decomposes per
  // character, so precomposed and combining accents come out alike.
  const units: Unit[] = [];
  let i = 0;
  for (const ch of s) {
    const from = i;
    i += ch.length;
    const n = ch
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
      .replace(/[\u201c\u201d\u2033]/g, '"')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[\u200b-\u200d\u2060\ufeff]/g, '');
    for (const c of n) units.push({ c, from, to: i });
  }

  const out: Mapped = { text: '', from: [], to: [] };
  for (let k = 0; k < units.length; k++) {
    // A list marker at the start of a line goes, so a quote that runs from a heading into its
    // first bullet still matches
    if (k === 0 || units[k - 1].c === '\n') {
      let j = k;
      while (j < units.length && isBlank(units[j].c)) j++;
      if (j + 1 < units.length && isListMarker(units[j].c) && isBlank(units[j + 1].c)) {
        j += 1;
        while (j < units.length && isBlank(units[j].c)) j++;
        k = j - 1;
        continue;
      }
    }
    const u = units[k];
    let c = u.c;
    // Runs of whitespace become one space, and leading whitespace goes
    if (/\s/.test(c)) {
      if (out.text === '') continue;
      if (out.text.endsWith(' ')) {
        out.to[out.to.length - 1] = u.to;
        continue;
      }
      c = ' ';
    }
    for (let x = 0; x < c.length; x++) {
      out.text += c[x];
      out.from.push(u.from);
      out.to.push(u.to);
    }
  }
  if (out.text.endsWith(' ')) {
    out.text = out.text.slice(0, -1);
    out.from.pop();
    out.to.pop();
  }
  return out;
}

/** The quote check's normal form of a text, for comparing two texts. */
export function normaliseForQuote(s: string): string {
  return normaliseMapped(s).text;
}

function stripWrapping(q: string): string {
  return q.trim().replace(/^["'\u201c\u2018]+|["'\u201d\u2019]+$/g, '').trim();
}

/** A passage of the original text, as [start, end) offsets. */
export type Span = [number, number];

function spansIn(quote: string, mapped: Mapped): Span[] {
  const q = normaliseForQuote(stripWrapping(quote));
  // Some substance: at least four characters including a letter, so "a" or "..." can't match everything
  if (q.length < 4 || !/\p{L}/u.test(q)) return [];
  const spans: Span[] = [];
  for (let at = mapped.text.indexOf(q); at !== -1; at = mapped.text.indexOf(q, at + 1)) {
    spans.push([mapped.from[at], mapped.to[at + q.length - 1]]);
  }
  return spans;
}

/**
 * Every passage of the source the quote matches, tolerant of case, whitespace, typographic
 * quotes and dashes, list markers and zero-width characters. The spans are exact offsets into
 * the source, so what's shown is always the source's own text.
 */
export function findQuote(quote: string, source: string): Span[] {
  return spansIn(quote, normaliseMapped(source));
}

export function isVerbatimQuote(quote: string, source: string): boolean {
  return findQuote(quote, source).length > 0;
}

const overlaps = (a: Span, b: Span) => a[0] < b[1] && b[0] < a[1];

export type Validation = { ok: true; value: FitAssessment } | { ok: false; problems: string[] };

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Check parsed model output against the schema, plus what JSON schema can't say: two or
 * three distinct reasons quoting passages that don't overlap, every quote found in the
 * posting, a quote wherever a value claims something, and a verdict its reasons can support.
 * Quotes come back as the posting's exact text for the passage each one matched.
 */
export function validateAssessment(raw: unknown, source: string): Validation {
  if (!isObject(raw)) return { ok: false, problems: ['output is not a JSON object'] };
  const problems: string[] = [];

  const mapped = normaliseMapped(source);
  // Each quote resolves to the passages of the posting it matches; what's returned is the
  // posting's own text for one of them, never the model's rendering of it
  const quote = (name: string, q: unknown, required: boolean): Span[] => {
    if (q === null) {
      if (required) problems.push(`${name}: a quote is required`);
      return [];
    }
    if (typeof q !== 'string') return (problems.push(`${name}: expected a string or null`), []);
    if (q.length > MAX_QUOTE_CHARS * 2 || normaliseForQuote(q).length > MAX_QUOTE_CHARS) {
      return (problems.push(`${name}: quote is longer than ${MAX_QUOTE_CHARS} characters`), []);
    }
    const spans = spansIn(q, mapped);
    if (!spans.length) problems.push(`${name}: not a verbatim quote from the posting: ${JSON.stringify(q.slice(0, 120))}`);
    return spans;
  };
  const text = (span: Span | undefined) => (span ? source.slice(span[0], span[1]) : null);

  const verdict = raw.verdict;
  if (!VERDICTS.includes(verdict as Verdict)) problems.push(`verdict: expected ${VERDICTS.join('|')}`);

  const reasons = raw.reasons;
  const reasonSpans: Span[] = [];
  if (!Array.isArray(reasons) || reasons.length < MIN_REASONS || reasons.length > MAX_REASONS) {
    problems.push(`reasons: expected ${MIN_REASONS} to ${MAX_REASONS}`);
  } else {
    const seen = new Set<string>();
    const quotes = new Set<string>();
    const claimed: Span[] = [];
    reasons.forEach((r, i) => {
      if (!isObject(r)) return problems.push(`reasons[${i}]: expected an object`);
      if (!REASON_CODES.includes(r.code as ReasonCode)) problems.push(`reasons[${i}].code: not a known reason code`);
      else if (seen.has(r.code as string)) problems.push(`reasons[${i}].code: ${r.code} given twice`);
      seen.add(r.code as string);
      const spans = quote(`reasons[${i}].quote`, r.quote, true);
      if (!spans.length) return;
      // The same passage twice, or one inside or across another, reads as one reason padded
      // out: each reason needs a passage of its own, and the same words elsewhere don't count
      const q = normaliseForQuote(stripWrapping(r.quote as string));
      const own = spans.find((s) => !claimed.some((c) => overlaps(s, c)));
      if (quotes.has(q) || !own) problems.push(`reasons[${i}].quote: quotes the same passage as another reason`);
      else reasonSpans[i] = own;
      quotes.add(q);
      if (own) claimed.push(own);
    });
    // A strong fit needs a reason for it, and a poor fit a reason against
    const sides = reasons.filter(isObject).map((r) => REASONS[r.code as ReasonCode]?.side);
    if (verdict === 'strong' && !sides.includes('for')) problems.push('reasons: a strong fit needs at least one reason for it');
    if (verdict === 'poor' && !sides.includes('against') && !sides.includes('mixed')) {
      problems.push('reasons: a poor fit needs at least one reason against it');
    }
  }

  const location = raw.location;
  let locationSpan: Span | undefined;
  if (!isObject(location) || !LOCATIONS.includes(location.verdict as LocationVerdict)) {
    problems.push(`location.verdict: expected ${LOCATIONS.join('|')}`);
  } else {
    locationSpan = quote('location.quote', location.quote ?? null, location.verdict !== 'unclear')[0];
  }

  const injection = raw.injection;
  let injectionSpan: Span | undefined;
  if (!isObject(injection) || typeof injection.present !== 'boolean') {
    problems.push('injection.present: expected true or false');
  } else if (injection.present) {
    injectionSpan = quote('injection.quote', injection.quote ?? null, true)[0];
  } else if (injection.quote !== null && injection.quote !== undefined) {
    problems.push('injection.quote: must be null when nothing is present');
  }

  const extra = Object.keys(raw).filter((k) => !(k in assessmentJsonSchema.properties));
  if (extra.length) problems.push(`unexpected fields: ${extra.join(', ')}`);

  if (problems.length) return { ok: false, problems };
  // Rebuild rather than pass the object through, so nothing unexpected rides along, and every
  // quote is the posting's own text
  const r = raw as unknown as FitAssessment;
  return {
    ok: true,
    value: {
      verdict: r.verdict,
      reasons: r.reasons.map(({ code }, i) => ({ code, quote: text(reasonSpans[i])! })),
      location: { verdict: r.location.verdict, quote: text(locationSpan) },
      injection: { present: r.injection.present, quote: r.injection.present ? text(injectionSpan) : null },
    },
  };
}
