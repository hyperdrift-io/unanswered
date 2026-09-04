'use client';

import { useState, useTransition } from 'react';
import { findUnansweredAsks } from '../queries.ts';
import type { Search } from '../lib/asks.ts';

// The island. One form, one typed server function, one list.
export function AskFinder() {
  const [result, setResult] = useState<Search | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const whatYouKnow = String(new FormData(e.currentTarget).get('know') ?? '');
    setError(null);
    startTransition(async () => {
      try {
        setResult(await findUnansweredAsks(whatYouKnow));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} data-pending={pending ? '' : undefined}>
        <label htmlFor="know">What do you know?</label>
        <textarea
          id="know"
          name="know"
          rows={3}
          required
          minLength={3}
          maxLength={600}
          placeholder="React and TypeScript, Node backends, Postgres, a bit of Go. I care about developer tooling and accessibility."
        />
        <button type="submit" disabled={pending}>
          {pending ? 'Reading the asks…' : 'Find who I can help'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {result && (
        <section aria-live="polite">
          <p>
            {result.asks.length === 0
              ? 'Our scan found nothing you could take on right now. Try naming a language or two.'
              : `${result.considered} unanswered asks in ${result.languages.join(' and ')}. These ${result.asks.length} are yours.`}
          </p>
          {result.asks.map((ask) => (
            <article key={ask.id}>
              <h3>
                <a href={ask.url} target="_blank" rel="noreferrer">
                  {ask.repo} <small>#{ask.number}</small>
                </a>
              </h3>
              <p>{ask.title}</p>
              <p>
                <time dateTime={ask.createdAt}>{ask.daysUnanswered} days</time> without a reply · asked by {ask.author}
              </p>
              <p>{ask.whyYou}</p>
              <blockquote>{ask.reply}</blockquote>
              <CopyButton text={ask.reply} />
              <a href={ask.url} target="_blank" rel="noreferrer">Open the issue and reply</a>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

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
