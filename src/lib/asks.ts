// The whole product in one function: what you know → the asks you can answer,
// each with a drafted first reply. Shared by the page and the MCP server.

import { languagesFor, pickAndDraft } from './gemini.ts';
import { searchUnanswered, type Candidate } from './github.ts';

export type Ask = Candidate & { whyYou: string; reply: string };

export type Search = {
  whatYouKnow: string;
  languages: string[];
  considered: number;
  asks: Ask[];
  /** A limit of our scan, said plainly — never a stack trace, never the person's fault. */
  error?: string;
};

export async function findAsks(whatYouKnow: string, max = 5): Promise<Search> {
  const known = whatYouKnow.trim().slice(0, 600);
  const empty: Search = { whatYouKnow: known, languages: [], considered: 0, asks: [] };
  if (known.length < 3) return empty;

  try {
    const languages = await languagesFor(known);
    const batches: Candidate[][] = [];
    for (const l of languages) batches.push(await searchUnanswered(l, 10));
    const candidates = dedupe(batches.flat()).sort((a, b) => b.daysUnanswered - a.daysUnanswered);
    if (candidates.length === 0) return { ...empty, languages };

    const picks = await pickAndDraft(known, candidates, max);
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const asks = picks.flatMap((p) => {
      const c = byId.get(p.id);
      return c ? [{ ...c, whyYou: p.whyYou, reply: p.reply }] : [];
    });
    return { whatYouKnow: known, languages, considered: candidates.length, asks };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ...empty, error: friendly(message) };
  }
}

function friendly(message: string): string {
  if (/rate-limit|403|429/.test(message)) return 'GitHub is rate-limiting our scan for a minute. Try again shortly.';
  if (/Gemini/.test(message)) return 'Gemini did not answer this time. Try again in a moment.';
  return 'Our scan hit a snag. Try again in a moment.';
}

export function dedupe(items: Candidate[]): Candidate[] {
  const seen = new Set<number>();
  return items.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}
