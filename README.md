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
   weeks to a year old, most recently touched first, in the languages you
   named. Only asks opened by the repo's owner, a member or a collaborator
   count: "a maintainer asked" is literally true. One ask per repo, longest
   wait first. (No `stars:` filter: issue search does not support it and
   GitHub silently matches the number against the issue number instead. Every
   result came back as issue #30 until we noticed.)
2. Your words map to one or two GitHub languages with a keyword table. Gemini
   (`gemini-3.6-flash`, minimal thinking, about a second) steps in only when the
   table draws a blank. The model is reached through Vertex AI with a service
   account (token minted by hand with `node:crypto`, no SDK) or, failing that,
   through the Gemini API with a key.
3. Gemini reads the asks, keeps the ones you could genuinely move, says what
   each maintainer wants in plain words, why it is you, and drafts the first
   comment: acknowledge the specific ask, offer one concrete step, promise
   nothing you won't do.
4. You read it, change it, post it. **Nothing is posted for you.**

The page answers in two beats: the scan (GitHub, cached, about a second) shows
how many maintainers asked and where; the picks follow when Gemini is done.
The same words get the same picks for a day, so a shared link such as
`/?know=Go+and+Kubernetes` lands on results instantly.

## Run it

```bash
pnpm install
cp .env.example .env     # a Vertex service account (or GEMINI_API_KEY on the free tier), optional GITHUB_TOKEN
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
