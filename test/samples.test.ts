import { describe, expect, it } from 'vitest';
import { quoteRanges } from '../src/components/fit/result.ts';
import { preparePosting } from '../src/fit/check.ts';
import { MODEL, PROMPT_VERSION } from '../src/fit/prompt.ts';
import { SAMPLE_RESULTS } from '../src/fit/sample-results.ts';
import { SAMPLE_POSTINGS } from '../src/fit/samples.ts';
import { validateAssessment } from '../src/fit/schema.ts';

// The samples' answers are committed. If one of these fails after a change to the prompt, the
// model or a sample, re-run scripts/fit-samples.ts and commit the JSON.
describe('committed sample results', () => {
  it('come from the current model and prompt', () => {
    expect(SAMPLE_RESULTS.model).toBe(MODEL);
    expect(SAMPLE_RESULTS.promptVersion).toBe(PROMPT_VERSION);
  });

  for (const s of SAMPLE_POSTINGS) {
    describe(s.id, () => {
      const result = SAMPLE_RESULTS.results[s.id];

      it('passes the same checks a live answer must', () => {
        const posting = preparePosting(s.text);
        expect(posting.ok).toBe(true);
        expect(validateAssessment(result, s.text)).toEqual({ ok: true, value: result });
      });

      it('shows what the sample was written for', () => {
        if (s.id === 'injection') {
          expect(result?.injection.present).toBe(true);
          expect(result?.verdict).not.toBe('strong');
        } else {
          expect(result?.verdict).toBe(s.id);
          expect(result?.injection.present).toBe(false);
        }
      });

      it('has every quote found in the posting, so each can be marked', () => {
        const quotes = [...result!.reasons.map((r) => r.quote), result!.location.quote, result!.injection.quote].filter((q): q is string => !!q);
        for (const q of quotes) expect(quoteRanges(s.text, [q]), q).toHaveLength(1);
      });
    });
  }
});
