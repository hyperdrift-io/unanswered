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
};

export async function findAsks(whatYouKnow: string, max = 5): Promise<Search> {
  const known = whatYouKnow.trim().slice(0, 600);
  if (known.length < 3) return { whatYouKnow: known, languages: [], considered: 0, asks: [] };

  const languages = await languagesFor(known);
  const batches: Candidate[][] = [];
  for (const l of languages) batches.push(await searchUnanswered(l, 10));
  const candidates = dedupe(batches.flat()).sort((a, b) => b.daysUnanswered - a.daysUnanswered);
  if (candidates.length === 0) return { whatYouKnow: known, languages, considered: 0, asks: [] };

  const picks = await pickAndDraft(known, candidates, max);
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const asks = picks.flatMap((p) => {
    const c = byId.get(p.id);
    return c ? [{ ...c, whyYou: p.whyYou, reply: p.reply }] : [];
  });
  return { whatYouKnow: known, languages, considered: candidates.length, asks };
}

export function dedupe(items: Candidate[]): Candidate[] {
  const seen = new Set<number>();
  return items.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
}
