import { AskFinder } from '../components/ask-finder.tsx';

// Static shell; the finder is the only client island.
export default async function HomePage() {
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

      <AskFinder />

      <section>
        <h2>How it works</h2>
        <ol>
          <li>GitHub search for open <em>help wanted</em> issues with no assignee and zero comments, at least three weeks old, on repos people actually use.</li>
          <li>Gemini reads your line, picks the ones you could genuinely answer, and says why in one sentence.</li>
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

export const getConfig = async () => {
  return { render: 'static' } as const;
};
