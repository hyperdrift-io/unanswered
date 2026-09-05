// Gemini does two things here, and only two: turn "what I know" into search
// languages when the keyword map draws a blank, and choose the asks this person
// can actually answer — saying what the maintainer wants in plain words, with a
// first reply drafted in a voice that leaves them better off.

import { accessToken, serviceAccount } from './google-auth.ts';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';

// Two doors to the same model. Vertex AI (a service account on a billed project)
// when the credentials are present; otherwise the Gemini API with a plain key,
// which is the free tier and its twenty requests a day.
async function endpoint(): Promise<{ url: string; headers: Record<string, string> }> {
  const sa = serviceAccount();
  const project = process.env.VERTEX_PROJECT ?? sa?.project_id;
  if (sa && project) {
    const location = process.env.VERTEX_LOCATION ?? 'global';
    return {
      url: `https://aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${MODEL}:generateContent`,
      headers: { Authorization: `Bearer ${await accessToken(sa)}` },
    };
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Neither GOOGLE_SA_KEY_B64 nor GEMINI_API_KEY is set');
  return { url: `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, headers: {} };
}

type Schema = Record<string, unknown>;
type Thinking = 'minimal' | 'low' | 'medium' | 'high';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One call, with a single retry on the transient 503 Gemini gives under load. A 429 is quota, not weather: fail fast. */
async function generateJson<T>(prompt: string, schema: Schema, thinking: Thinking): Promise<T> {
  try {
    return await generateOnce<T>(prompt, schema, thinking);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (!/^Gemini 503/.test(message)) throw err;
    await sleep(2000);
    return generateOnce<T>(prompt, schema, thinking);
  }
}

async function generateOnce<T>(prompt: string, schema: Schema, thinking: Thinking): Promise<T> {
  const { url, headers } = await endpoint();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: thinking },
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  // Gemini 3.x may put a thought-signature part before the answer: join every non-thought text part.
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  if (!text) throw new Error('Gemini returned no text part');
  return JSON.parse(text) as T;
}

/** Fallback for text the keyword map cannot place: "I do embedded audio DSP" → ["C++", "C"]. */
export async function languagesFor(whatYouKnow: string): Promise<string[]> {
  const out = await generateJson<{ languages: string[] }>(
    `Someone describes what they know: """${whatYouKnow.slice(0, 600)}"""
Return the one or two GitHub *language* names (as GitHub's search uses them, e.g. "TypeScript", "Python", "Go", "Rust", "JavaScript", "C#", "Java", "Ruby", "PHP", "Swift", "Kotlin", "Shell", "CSS") where this person could most credibly answer an open-source issue. Frameworks map to their language. If nothing maps, return ["JavaScript"].`,
    {
      type: 'object',
      properties: { languages: { type: 'array', items: { type: 'string' }, maxItems: 2 } },
      required: ['languages'],
    },
    'minimal',
  );
  const langs = out.languages.map((l) => l.trim()).filter(Boolean).slice(0, 2);
  return langs.length ? langs : ['JavaScript'];
}

export type Pick = { id: number; asking: string; whyYou: string; reply: string };

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

Below are open-source issues where a maintainer labelled the issue "help wanted" and nobody has replied. Choose at most ${max} the person could genuinely move forward, best first. Skip anything that needs deep repo context they cannot have, anything that reads as spam or machine-generated, and anything ambiguous about what the maintainer actually wants.

For each pick write:
- asking: one plain sentence saying what the maintainer actually wants done, as you would explain it to a friend. No jargon the issue did not use.
- whyYou: one sentence, second person, naming the specific skill of theirs that fits. No flattery.
- reply: the first comment they would post on the issue. 40 to 110 words. Plain, warm, human. Open with the specific detail that shows they read the issue, never with a formula: "I see you want", "I noticed", "A good first step would be" and "Happy to help" are banned, and no two replies may open the same way. Offer one concrete first step (a question that unblocks, a pointer, or one small piece). Never promise the whole thing, a pull request, or a timeline: "this week", "I'll open a PR" and "once clarified" are out. No emoji, no "I'd love to", no "not just X but Y", no bullet lists. It must read as if written by a person who read the issue, not by an assistant.

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
              asking: { type: 'string' },
              whyYou: { type: 'string' },
              reply: { type: 'string' },
            },
            required: ['id', 'asking', 'whyYou', 'reply'],
          },
        },
      },
      required: ['picks'],
    },
    'low',
  );
  const known = new Set(candidates.map((c) => c.id));
  return out.picks.filter((p) => known.has(p.id)).slice(0, max);
}
