'use server';

import { scanAsks, pickAsks, warmExamples, type Scan, type Picks } from './lib/asks.ts';
import type { Candidate } from './lib/github.ts';
import { warmCache, unansweredTotals } from './lib/github.ts';
import { EXAMPLES } from './lib/examples.ts';

// The server loads this module once: fill the caches before the first visitor asks.
warmCache();
warmExamples(EXAMPLES);

// Two typed server functions the island calls in sequence. Their signatures are
// the contract: no API route, no client fetch library, the return type is the
// client's type. The scan answers in about a second; the picks take Gemini's time.
export async function scanUnanswered(whatYouKnow: string): Promise<Scan> {
  return scanAsks(whatYouKnow);
}

export async function pickUnanswered(whatYouKnow: string, candidates: Candidate[]): Promise<Picks> {
  return pickAsks(whatYouKnow, candidates, 5);
}

/** The live number in the hero. Lives here so the page reads the same cache the scan fills. */
export async function countUnanswered(): Promise<{ total: number; languages: number }> {
  return unansweredTotals();
}
