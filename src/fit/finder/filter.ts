// Which listed roles the finder may pick: plain rules over a role's title and the board's own
// location fields. Deliberately loose. They only narrow the pick towards roles the profile
// could plausibly fit; the check itself decides, from the posting's text.

/** The kinds of role the profile is about. */
const TITLE_IN =
  /(product engineer|product software engineer|ai engineer|applied ai|founding engineer|front[\s-]?end|full[\s-]?stack|design engineer|ux engineer|ui engineer|software engineer,? (?:product|ai|frontend|full)|ai product|\bllm|\bagent)/i;

/** Kinds it isn't, even when the words above appear: other disciplines, other levels, other jobs. */
const TITLE_OUT =
  /(backend|back[\s-]end|platform|infrastructure|mechanical|architect|gtm|data scien|data engineer|machine learning|\bml engineer|research|security|\bios\b|android|mobile|embedded|manager|director|head of|\bvp\b|intern|graduate|junior|sales|solutions|support|forward[\s-]deployed|recruit)/i;

export function titleFits(title: string): boolean {
  return TITLE_IN.test(title) && !TITLE_OUT.test(title);
}

/** A UK place or the UK itself (GB as Lever gives the country). "New York" is taken out first, so York means York; Cambridge is left out, as it is often Massachusetts. */
const UK =
  /\b(uk|gb|u\.k\.|united kingdom|great britain|england|scotland|wales|london|manchester|leeds|york|yorkshire|edinburgh|glasgow|bristol|oxford|birmingham|newcastle|sheffield)\b/i;

/** "Remote" and nothing narrower. */
const ANYWHERE = /^(?:remote|fully remote|anywhere|worldwide|global|emea|europe|remote[\s\-–(:,]+(?:anywhere|worldwide|global|emea|europe)\)?)$/i;

/**
 * Whether the board's location fields leave the UK open: a UK place among them, or nothing
 * narrower than "Remote", "EMEA" or "Europe". Anything else, a US-only remote role or an
 * office abroad, isn't picked.
 */
export function placeFits(places: readonly (string | null | undefined)[]): boolean {
  const named = places.filter((p): p is string => !!p && !!p.trim()).map((p) => p.replace(/new york/gi, 'NYC'));
  if (!named.length) return false;
  if (named.some((p) => UK.test(p))) return true;
  return named.flatMap((p) => p.split(/[;|/]/)).every((p) => ANYWHERE.test(p.trim()));
}
