// A posting cut into sentences, with where each sits in the text, so a sentence Jev marks can
// be tinted in place. Code does the cutting; the model only judges. Throwaway: for the Jev
// mock-up. Each line is a unit (a title, a field, a bullet), and a paragraph is cut after a
// full stop, question or exclamation mark that's followed by a capital.

export interface Sentence {
  id: string;
  text: string;
  from: number;
  to: number;
  /** A section heading such as "The role": never asked about, as it only says what follows. */
  heading: boolean;
}

/** A short line on its own with no full stop, after the first line: the band's own rule for headings. */
const isHeading = (line: string, first: boolean) => !first && line.length <= 40 && !/[.:;,!?]$/.test(line) && !/:/.test(line);

const BULLET = /^[ \t]*[-*•·][ \t]+/;
const END = /[.!?](?=\s+["“'(]?[A-Z0-9£])/g;

export function sentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const lineStart = offset;
    offset += line.length + 1;
    const lead = (BULLET.exec(line) ?? /^\s*/.exec(line)!)[0].length;
    const body = line.slice(lead).trimEnd();
    if (body.length < 3) continue;
    const heading = !lead && isHeading(body, out.length === 0);
    let at = 0;
    const cuts = [...body.matchAll(END)].map((m) => m.index! + 1);
    for (const cut of [...cuts, body.length]) {
      const piece = body.slice(at, cut);
      const trimmed = piece.trim();
      if (trimmed.length >= 3) {
        const from = lineStart + lead + at + (piece.length - piece.trimStart().length);
        out.push({ id: `s${out.length + 1}`, text: trimmed, from, to: from + trimmed.length, heading });
      }
      at = cut;
    }
  }
  return out;
}
