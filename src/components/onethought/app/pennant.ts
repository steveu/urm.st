// The sealed page's pennant (SealedView.swift): one soft crest marching from the hoist to a
// drooping tip, smoothed Catmull-Rom and closed. Baked to frames for an SVG <animate>, one
// pass of the wave every 5.2 seconds, as the app flies it.
export function pennant(phase: number) {
  const length = 30, segments = 9, yMid = 7, rootHalf = 9, tipHalf = 0.8;
  const k = 1.15, tipAmp = 1.9, bodyAmp = 0.4, droop = 4.6;
  const d = (t: number) => (bodyAmp + (tipAmp - bodyAmp) * t) * Math.min(1, t * 4.5) * Math.sin(k * t * Math.PI * 2 - phase) + droop * t ** 1.4;
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const half = rootHalf + (tipHalf - rootHalf) * t;
    top.push([t * length, yMid - half + d(t)]);
    bottom.push([t * length, yMid + half + d(t)]);
  }
  const p = [...top, ...bottom.reverse()];
  const n = p.length;
  const f = (v: number) => v.toFixed(2);
  let path = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p[(i - 1 + n) % n], p[i], p[(i + 1) % n], p[(i + 2) % n]];
    path += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return path + 'Z';
}
/** One pass of the wave, as frames, the last the same as the first so it loops */
export function pennantFrames(count = 32) {
  return Array.from({ length: count + 1 }, (_, i) => pennant((i / count) * 2 * Math.PI));
}
