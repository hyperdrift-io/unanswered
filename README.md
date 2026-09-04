# unanswered

**Somebody asked for help. Nobody came.**

Every day a maintainer labels an issue *help wanted* and waits. Weeks pass. The
person who could have answered never saw it. This finds those asks, matches
them to what you know, and drafts your first reply, so giving an hour to open
source starts with a comment instead of an evening of searching.

Live: **unanswered.hyperdrift.io**

Built in a weekend for the [DEV Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03).

## What it does

1. GitHub search: open `help wanted` issues, no assignee, zero comments, three
   weeks to a year old, on repos with more than twenty stars, in the languages
   you named.
2. Gemini (`gemini-3.6-flash`) turns your line into search languages, picks the
   asks you could genuinely move forward, and says why in one sentence.
3. Gemini drafts the first comment: acknowledge the specific ask, offer one
   concrete step, promise nothing you won't do.
4. You read it, change it, post it. **Nothing is posted for you.**

## Run it

```bash
pnpm install
cp .env.example .env     # GEMINI_API_KEY (free tier is enough), optional GITHUB_TOKEN
pnpm dev                 # http://localhost:3000
pnpm test
```

## For agents: the MCP server

The same two acts, for Claude, ChatGPT or any MCP client:

```bash
pnpm mcp
```

Tools: `find_unanswered_asks(what_you_know, max)` and
`draft_first_reply(what_you_know, repo, title, body)`. Config example at the top
of `mcp/server.ts`.

## Stack

[Waku](https://waku.gg) (React Server Components) with one typed server
function and one client island, pure cascading CSS, the Gemini API over plain
`fetch`, the MCP TypeScript SDK. Seven dependencies. No database, no accounts,
no tracking of who you helped: that part is yours.

## Licence

MIT. Built by [Hyperdrift](https://hyperdrift.io).
