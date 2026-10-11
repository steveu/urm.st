// The three holes are numbered as the corner they echo: the 11th, 12th and 13th. Inside,
// they stay holes 1 to 3, because that's what the composer's mapping is built for: par
// for holes 1..3 and holesPlayed 3. Passing 13 instead would let a changepoint clause say
// "all after the 10th", about ten holes nobody played. So the sentence is composed for
// 1..3 and its hole ordinals are renumbered afterwards, here. read.ts only ever writes an
// ordinal for a hole; its counts are words, or plain digits with no suffix.
//
// Pure: no imports, so the sim check can run it.

/** How far the shown numbers sit from the internal ones */
export const OFFSET = 10;

const WORDS: Record<number, string> = { 11: 'eleventh', 12: 'twelfth', 13: 'thirteenth' };

/** The number the player sees for internal hole n */
export const shown = (n: number) => n + OFFSET;

/** As a word, for the hole panel and the status line: "eleventh" */
export const shownWord = (n: number) => WORDS[n + OFFSET] ?? `${n + OFFSET}th`;

/** As an ordinal, for the record card: "11th" */
export const shownOrdinal = (n: number) => `${n + OFFSET}th`;

/** Every hole ordinal in a finished sentence, 1st to 3rd, as the hole it was played as */
export const renumber = (s: string) => s.replace(/\b([1-3])(?:st|nd|rd)\b/g, (_, n: string) => shownOrdinal(Number(n)));
