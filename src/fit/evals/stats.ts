// Counts and rates for the fit check's evals. Only these aggregates are committed: never a
// posting, a title or an employer.

export interface Rate {
  /** Hits. */
  k: number;
  /** Out of. */
  n: number;
  /** k / n, or null when n is 0. */
  rate: number | null;
  /** Wilson score interval, 95%. Null when n is 0. */
  low: number | null;
  high: number | null;
}

const Z95 = 1.959964;

/**
 * k out of n with a Wilson 95% interval: unlike the plain ± formula it stays inside 0 to 1
 * and behaves at small n and at rates near 0 or 1, which is where these samples sit.
 */
export function wilson(k: number, n: number, z = Z95): Rate {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n < 0 || k > n) throw new Error(`wilson: bad counts ${k}/${n}`);
  if (n === 0) return { k, n, rate: null, low: null, high: null };
  const p = k / n;
  const z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return { k, n, rate: round(p), low: round(Math.max(0, centre - half)), high: round(Math.min(1, centre + half)) };
}

/** "51%" for the page; a dash when there's nothing to divide by. */
export function percent(r: Pick<Rate, 'rate'>): string {
  return r.rate === null ? '–' : `${Math.round(r.rate * 100)}%`;
}

/** "38 to 64%" for the page. */
export function interval(r: Pick<Rate, 'low' | 'high'>): string {
  if (r.low === null || r.high === null) return '–';
  return `${Math.round(r.low * 100)} to ${Math.round(r.high * 100)}%`;
}
