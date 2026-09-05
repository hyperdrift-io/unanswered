'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { scanUnanswered, pickUnanswered } from '../queries.ts';
import type { Ask } from '../lib/asks.ts';
import type { Candidate } from '../lib/github.ts';
import { EXAMPLES } from '../lib/examples.ts';

type Phase =
  | { at: 'idle' }
  | { at: 'scanning' }
  | { at: 'picking'; languages: string[]; considered: number }
  | { at: 'done'; languages: string[]; considered: number; asks: Ask[] }
  | { at: 'unranked'; languages: string[]; considered: number; candidates: Candidate[]; message: string }
  | { at: 'error'; message: string };

// The island. One form, two typed server functions, one list that fills in two beats:
// first the scan (what is waiting, in which languages), then the picks with the drafts.
export function AskFinder() {
  const [phase, setPhase] = useState<Phase>({ at: 'idle' });
  const [pending, startTransition] = useTransition();
  const textarea = useRef<HTMLTextAreaElement>(null);

  function search(whatYouKnow: string) {
    const know = whatYouKnow.trim();
    if (know.length < 3) return;
    const url = new URL(location.href);
    url.searchParams.set('know', know);
    history.replaceState(null, '', url);
    setPhase({ at: 'scanning' });
    startTransition(async () => {
      const scan = await scanUnanswered(know);
      if (scan.error) return setPhase({ at: 'error', message: scan.error });
      const considered = scan.candidates.length;
      if (considered === 0) return setPhase({ at: 'done', languages: scan.languages, considered, asks: [] });
      setPhase({ at: 'picking', languages: scan.languages, considered });
      const picks = await pickUnanswered(know, scan.candidates);
      if (picks.error) {
        // Gemini is out for now: the maintainers are still real. Show the five who waited longest.
        return setPhase({ at: 'unranked', languages: scan.languages, considered, candidates: scan.candidates.slice(0, 5), message: picks.error });
      }
      setPhase({ at: 'done', languages: scan.languages, considered, asks: picks.asks });
    });
  }

  // A link with ?know= lands on results, not on an empty form.
  useEffect(() => {
    const know = new URLSearchParams(location.search).get('know');
    if (know && textarea.current) {
      textarea.current.value = know;
      search(know);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search(String(new FormData(e.currentTarget).get('know') ?? ''));
  }

  function useExample(text: string) {
    if (textarea.current) textarea.current.value = text;
    search(text);
  }

  const busy = pending || phase.at === 'scanning' || phase.at === 'picking';

  return (
    <>
      <form onSubmit={onSubmit} data-pending={busy ? '' : undefined}>
        <label htmlFor="know">What do you know?</label>
        <textarea
          ref={textarea}
          id="know"
          name="know"
          rows={3}
          required
          minLength={3}
          maxLength={600}
          placeholder="React and TypeScript, Node backends, Postgres, a bit of Go. I care about developer tooling and accessibility."
        />
        <p>
          {EXAMPLES.map((text) => (
            <button key={text} type="button" name="example" value={text} onClick={() => useExample(text)} disabled={busy}>
              {text}
            </button>
          ))}
        </p>
        <button type="submit" disabled={busy}>
          {busy ? 'Reading the asks…' : 'Find who I can help'}
        </button>
      </form>

      {phase.at === 'error' && <p role="alert">{phase.message}</p>}

      {phase.at === 'scanning' && <p role="status">Scanning GitHub for maintainers who asked and heard nothing…</p>}

      {phase.at === 'picking' && (
        <p role="status">
          {phase.considered} maintainers asked in {phase.languages.join(' and ')} and nobody replied. Asking Gemini which of them you could answer…
        </p>
      )}

      {phase.at === 'unranked' && (
        <section aria-live="polite">
          <p role="alert">{phase.message}</p>
          {phase.candidates.map((ask) => (
            <article key={ask.id}>
              <h3>
                <a href={ask.url} target="_blank" rel="noreferrer">
                  {ask.repo} <small>#{ask.number}</small>
                </a>
              </h3>
              <p>{ask.title}</p>
              <p>
                <time dateTime={ask.createdAt}>{ask.daysUnanswered} days</time> without a reply · asked by {ask.author}, {role(ask.association)}
              </p>
              <a href={ask.url} target="_blank" rel="noreferrer">Open the issue and reply in your own words</a>
            </article>
          ))}
        </section>
      )}

      {phase.at === 'done' && (
        <section aria-live="polite">
          <p>{summary(phase)}</p>
          {phase.asks.map((ask) => (
            <article key={ask.id}>
              <h3>
                <a href={ask.url} target="_blank" rel="noreferrer">
                  {ask.repo} <small>#{ask.number}</small>
                </a>
              </h3>
              <p>{ask.title}</p>
              <p>
                <time dateTime={ask.createdAt}>{ask.daysUnanswered} days</time> without a reply · asked by {ask.author}, {role(ask.association)}
              </p>
              <dl>
                <dt>What they want</dt>
                <dd>{ask.asking}</dd>
                <dt>Why you</dt>
                <dd>{ask.whyYou}</dd>
              </dl>
              <blockquote>{ask.reply}</blockquote>
              <CopyButton text={ask.reply} />
              <a href={ask.url} target="_blank" rel="noreferrer">Open the issue and reply in your own words</a>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

function summary(p: { languages: string[]; considered: number; asks: Ask[] }): string {
  const where = p.languages.join(' and ');
  if (p.considered === 0) return `Our scan found no maintainer ask in ${where} right now. Try naming another language.`;
  if (p.asks.length === 0) return `${p.considered} maintainers asked in ${where}. None of these fit what you know yet, and that is a limit of our scan, not of you. Try naming another language.`;
  const these = p.asks.length === 1 ? 'This one is yours.' : `These ${p.asks.length} are yours.`;
  return `${p.considered} maintainers asked in ${where} and nobody replied. ${these}`;
}

const role = (association: string): string =>
  association === 'OWNER' ? 'who owns the repo' : association === 'MEMBER' ? 'a member of the org' : 'a collaborator on the repo';

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      value="copy"
      aria-pressed={done}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? 'Copied' : 'Copy the draft'}
    </button>
  );
}
