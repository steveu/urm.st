import type { FitAssessment } from './schema.ts';
import type { SamplePosting } from './samples.ts';
import json from './sample-results.json';

// The samples' answers, computed ahead by running the real check live (scripts/fit-samples.ts)
// and committed, so the samples are instant, cost nothing and render with scripts off.

export interface SampleResults {
  model: string;
  promptVersion: string;
  results: Partial<Record<SamplePosting['id'], FitAssessment>>;
}

export const SAMPLE_RESULTS = json as SampleResults;
