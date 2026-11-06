// The funnel's two plain rules, before Jev: a role's title and the board's own location
// fields. Deliberately wide. They only drop what a title or a place settles on its own; the
// judging is Jev's, then Haiku's.

/** Engineering, design or product work, by title. */
const IN = /(engineer|developer|design|product|front[\s-]?end|full[\s-]?stack|software|\bai\b|\bux\b|\bui\b)/i;

/** Jobs that aren't, whatever else the title says: selling, hiring, law, money, interns. */
const OUT =
  /(sales|account exec|account manag|recruit|talent|\bintern\b|internship|apprentic|graduate|counsel|legal|finance|accountant|payroll|business develop|\bsdr\b|\bbdr\b|people partner|executive assistant)/i;

/** An engineering, design or product role by its title. Jev sorts out which kind. */
export function inScope(title: string): boolean {
  return IN.test(title) && !OUT.test(title);
}

/** A UK place or the UK itself (GB as Lever gives the country). "New York" is taken out first, so York means York; Cambridge is left out, as it is often Massachusetts. */
const UK =
  /\b(uk|gb|u\.k\.|united kingdom|great britain|england|scotland|wales|london|manchester|leeds|york|yorkshire|edinburgh|glasgow|bristol|oxford|birmingham|newcastle|sheffield)\b/i;

/** "Remote" and nothing narrower. */
const ANYWHERE = /^(?:remote|fully remote|anywhere|worldwide|global|emea|europe|remote[\s\-–(:,]+(?:anywhere|worldwide|global|emea|europe)\)?)$/i;

/**
 * Whether the board's location fields leave the UK open: a UK place among them, or nothing
 * narrower than "Remote", "EMEA" or "Europe". Anything else, a US-only remote role or an
 * office abroad, is dropped.
 */
export function placeFits(places: readonly (string | null | undefined)[]): boolean {
  const named = places.filter((p): p is string => !!p && !!p.trim()).map((p) => p.replace(/new york/gi, 'NYC'));
  if (!named.length) return false;
  if (named.some((p) => UK.test(p))) return true;
  return named.flatMap((p) => p.split(/[;|/]/)).every((p) => ANYWHERE.test(p.trim()));
}
