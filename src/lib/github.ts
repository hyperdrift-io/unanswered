// GitHub Search: open issues where a maintainer asked for help and nobody replied.
// One search per language, never concurrent, cached for half an hour, and warmed for
// the common languages at boot — GitHub's secondary rate limit trips on a burst of
// three or on two concurrent searches, so the cache is not an optimisation, it is
// the design.

export type Candidate = {
  id: number;
  repo: string;
  number: number;
  title: string;
  body: string;
  url: string;
  labels: string[];
  language: string;
  author: string;
  createdAt: string;
  daysUnanswered: number;
};

const API = 'https://api.github.com';
const TTL_MS = 30 * 60 * 1000;
const MIN_STARS = 100;
const cache = new Map<string, { at: number; items: Candidate[] }>();

const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/** The ask must be at least three weeks old (nobody came) and under a year old (the repo is likely alive). */
export function buildQuery(language: string): string {
  return [
    'label:"help wanted"',
    'is:issue',
    'is:open',
    'no:assignee',
    'comments:0',
    `created:${isoDaysAgo(365)}..${isoDaysAgo(21)}`,
    `language:${JSON.stringify(language)}`,
    `stars:>${MIN_STARS}`,
  ].join(' ');
}

type SearchItem = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  labels: { name: string }[];
  user: { login: string };
  created_at: string;
};

// GitHub counts concurrent search calls against the secondary limit: one at a time.
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

const COMMON = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'Ruby'];

/** Fill the cache for the languages most people name, one search every few seconds. */
export function warmCache(): void {
  COMMON.forEach((lang, i) => {
    setTimeout(() => {
      searchUnanswered(lang, 10).catch(() => undefined);
    }, 1500 + i * 8000);
  });
}

export async function searchUnanswered(language: string, limit = 12): Promise<Candidate[]> {
  const key = language.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items.slice(0, limit);

  const params = new URLSearchParams({
    q: buildQuery(language),
    sort: 'created',
    order: 'desc',
    per_page: String(Math.min(limit * 2, 30)),
  });
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'unanswered.hyperdrift.io',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await withLock(() => fetch(`${API}/search/issues?${params}`, { headers }));
  if (res.status === 403 || res.status === 429) {
    if (hit) return hit.items.slice(0, limit); // stale beats nothing
    throw new Error('GitHub is rate-limiting our scan for a minute. Try again shortly.');
  }
  if (!res.ok) {
    throw new Error(`GitHub search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { items: SearchItem[] };
  const items = data.items.map<Candidate>((it) => ({
    id: it.id,
    repo: it.repository_url.replace(`${API}/repos/`, ''),
    number: it.number,
    title: it.title,
    body: (it.body ?? '').slice(0, 1200),
    url: it.html_url,
    labels: it.labels.map((l) => l.name),
    language,
    author: it.user.login,
    createdAt: it.created_at,
    daysUnanswered: daysSince(it.created_at),
  }));
  cache.set(key, { at: Date.now(), items });
  return items.slice(0, limit);
}
