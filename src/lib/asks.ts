// The whole product in two steps: what you know → the asks worth reading (fast,
// GitHub only) → the ones you can answer, with a first reply drafted (Gemini).
// Shared by the page and the MCP server.

import { languagesFor, pickAndDraft } from './gemini.ts';
import { guessLanguages } from './languages.ts';
import { searchUnanswered, type Candidate } from './github.ts';

export type Ask = Candidate & { asking: string; whyYou: string; reply: string };

export type Scan = {
  whatYouKnow: string;
  languages: string[];
  candidates: Candidate[];
  /** A limit of our scan, said plainly — never a stack trace, never the person's fault. */
  error?: string;
};

export type Picks = { asks: Ask[]; error?: string };

const MAX_CANDIDATES = 30;

/** Step one: the languages this person could answer in, and the maintainer asks waiting there. */
export async function scanAsks(whatYouKnow: string): Promise<Scan> {
  const known = normalise(whatYouKnow);
  const empty: Scan = { whatYouKnow: known, languages: [], candidates: [] };
  if (known.length < 3) return empty;
  try {
    const guessed = guessLanguages(known);
    const languages = guessed.length ? guessed : await languagesFor(known);
    const batches: Candidate[][] = [];
    for (const l of languages) batches.push(await searchUnanswered(l));
    const candidates = onePerRepo(dedupe(batches.flat()))
      .sort((a, b) => b.daysUnanswered - a.daysUnanswered)
      .slice(0, MAX_CANDIDATES);
    return { whatYouKnow: known, languages, candidates };
  } catch (err) {
    return { ...empty, error: friendly(err) };
  }
}

// The same words get the same answer for a day: a reader clicking the post's
// links, or an example chip, costs nothing and waits for nothing. This matters
// because the free Gemini tier allows twenty requests a day.
const TTL_MS = 24 * 60 * 60 * 1000;
const picksCache = new Map<string, { at: number; asks: Ask[] }>();

/** Step two: which of these asks this person can move forward, and the first reply for each. */
export async function pickAsks(whatYouKnow: string, candidates: Candidate[], max = 5): Promise<Picks> {
  const known = normalise(whatYouKnow);
  if (candidates.length === 0) return { asks: [] };
  const key = `${known}\n${candidates.map((c) => c.id).join(',')}`;
  const hit = picksCache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { asks: hit.asks };
  try {
    const picks = await pickAndDraft(known, candidates, max);
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const asks = picks.flatMap((p) => {
      const c = byId.get(p.id);
      return c ? [{ ...c, asking: p.asking, whyYou: p.whyYou, reply: p.reply }] : [];
    });
    if (picksCache.size > 500) picksCache.delete(picksCache.keys().next().value as string);
    picksCache.set(key, { at: Date.now(), asks });
    return { asks };
  } catch (err) {
    return { asks: [], error: friendly(err) };
  }
}

/** Warm the picks for the example chips once the GitHub cache is filled: a judge's first click costs no quota and no wait. */
export function warmExamples(examples: string[]): void {
  examples.forEach((text, i) => {
    setTimeout(() => {
      findAsks(text).catch(() => undefined);
    }, 90_000 + i * 20_000);
  });
}

/** Both steps in one call, for the MCP server. */
export async function findAsks(whatYouKnow: string, max = 5): Promise<Scan & Picks> {
  const scan = await scanAsks(whatYouKnow);
  if (scan.error || scan.candidates.length === 0) return { ...scan, asks: [] };
  const picks = await pickAsks(whatYouKnow, scan.candidates, max);
  return { ...scan, ...picks };
}

export const normalise = (text: string): string => text.trim().replace(/\s+/g, ' ').slice(0, 600);

export function dedupe(items: Candidate[]): Candidate[] {
  const seen = new Set<number>();
  return items.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}

/** One ask per repo, so five picks are five maintainers, not one repo's backlog. */
export function onePerRepo(items: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return items.filter((c) => (seen.has(c.repo) ? false : (seen.add(c.repo), true)));
}

function friendly(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[unanswered] scan failed:', message);
  if (/^Gemini 429/.test(message)) return 'Gemini has used up its free requests for today, so the asks below are unranked and undrafted. The maintainers are real; the words are yours.';
  if (/gemini/i.test(message)) return 'Gemini did not answer this time, so the asks below are unranked and undrafted.';
  if (/rate-limit|403|429/.test(message)) return 'GitHub is rate-limiting our scan for a minute. Try again shortly.';
  return 'Our scan hit a snag. Try again in a moment.';
}
