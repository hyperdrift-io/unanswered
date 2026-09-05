import { AskFinder } from '../components/ask-finder.tsx';
import { unansweredTotals } from '../lib/github.ts';

// Server-rendered shell with one live number; the finder is the only client island.
export default async function HomePage() {
  const { total, languages } = unansweredTotals();
  return (
    <>
      <title>unanswered — the maintainers who asked for help and got nothing</title>

      <h1>Somebody asked for help. Nobody came.</h1>
      <p>
        Every day a maintainer labels an issue <em>help wanted</em> and waits.
        Weeks pass. The person who could answer never saw it. Tell us what you
        know, and we find the asks you can move forward, with a first reply
        drafted so the generous thing takes five minutes instead of an evening.
      </p>
      {total > 0 && (
        <p>
          <strong>{total.toLocaleString('en-GB')}</strong> help-wanted issues across {words(languages)} languages
          have waited three weeks or more without a single reply. Right now.
        </p>
      )}

      <AskFinder />

      <section>
        <h2>How it works</h2>
        <ol>
          <li>GitHub search for open <em>help wanted</em> issues with no assignee and zero comments, three weeks to a year old, most recently touched first so the repo is still alive. Only asks opened by the people who run the repo count. One ask per repo.</li>
          <li>Your words map to one or two languages, no model needed. Gemini steps in only when the map draws a blank.</li>
          <li>Gemini reads the asks, keeps the ones you could genuinely move, says what each maintainer wants in plain words, and why it is you.</li>
          <li>Gemini drafts your first comment: acknowledge the ask, offer one concrete step, promise nothing you won't do.</li>
          <li>You read it, change it, and post it yourself. Nothing is posted for you. Generosity is a human act; we only removed the friction.</li>
        </ol>
        <p>
          Agents can do the same from a chat: the repo ships an MCP server with
          <code>find_unanswered_asks</code> and <code>draft_first_reply</code>.
        </p>
      </section>
    </>
  );
}

const words = (n: number): string =>
  (['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n));

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
