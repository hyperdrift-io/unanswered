// Gemini does two things here, and only two: turn "what I know" into search
// languages, and choose the asks this person can actually answer — with a first
// reply drafted in a voice that leaves the maintainer better off.

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

type Schema = Record<string, unknown>;

async function generateJson<T>(prompt: string, schema: Schema): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return JSON.parse(text) as T;
}

/** "React, a bit of Python, Postgres" → ["TypeScript", "Python"] (GitHub language names). */
export async function languagesFor(whatYouKnow: string): Promise<string[]> {
  const out = await generateJson<{ languages: string[] }>(
    `Someone describes what they know: """${whatYouKnow.slice(0, 600)}"""
Return the one or two GitHub *language* names (as GitHub's search uses them, e.g. "TypeScript", "Python", "Go", "Rust", "JavaScript", "C#", "Java", "Ruby", "PHP", "Swift", "Kotlin", "Shell", "CSS") where this person could most credibly answer an open-source issue. Frameworks map to their language (React, Vue, Node → TypeScript or JavaScript; Django → Python). If nothing maps, return ["JavaScript"].`,
    {
      type: 'object',
      properties: { languages: { type: 'array', items: { type: 'string' }, maxItems: 2 } },
      required: ['languages'],
    },
  );
  const langs = out.languages.map((l) => l.trim()).filter(Boolean).slice(0, 2);
  return langs.length ? langs : ['JavaScript'];
}

export type Pick = { id: number; whyYou: string; reply: string };

export async function pickAndDraft(
  whatYouKnow: string,
  candidates: { id: number; repo: string; title: string; body: string; labels: string[]; daysUnanswered: number }[],
  max = 5,
): Promise<Pick[]> {
  const list = candidates
    .map(
      (c) =>
        `--- id:${c.id} · ${c.repo} · ${c.daysUnanswered} days without a reply · labels: ${c.labels.join(', ')}\nTitle: ${c.title}\n${c.body.slice(0, 700)}`,
    )
    .join('\n\n');

  const out = await generateJson<{ picks: Pick[] }>(
    `A person wrote what they know: """${whatYouKnow.slice(0, 600)}"""

Below are open-source issues where a maintainer labelled the issue "help wanted" and nobody has replied. Choose at most ${max} the person could genuinely move forward, best first. Skip anything that needs deep repo context they cannot have, anything that reads as spam, and anything ambiguous about what the maintainer actually wants.

For each pick write:
- whyYou: one sentence, second person, naming the specific skill of theirs that fits. No flattery.
- reply: the first comment they would post on the issue. 40 to 110 words. Plain, warm, human. Open by acknowledging the specific ask. Offer one concrete first step (a question that unblocks, a pointer, or a small piece they can do this week). Never promise to do the whole thing. No emoji, no "I'd love to", no "not just X but Y", no bullet lists. It must read as if written by a person who read the issue, not by an assistant.

${list}`,
    {
      type: 'object',
      properties: {
        picks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              whyYou: { type: 'string' },
              reply: { type: 'string' },
            },
            required: ['id', 'whyYou', 'reply'],
          },
        },
      },
      required: ['picks'],
    },
  );
  const known = new Set(candidates.map((c) => c.id));
  return out.picks.filter((p) => known.has(p.id)).slice(0, max);
}
