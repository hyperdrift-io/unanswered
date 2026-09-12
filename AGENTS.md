# unanswered

> **Inherits**: [Hyperdrift workspace AGENTS.md](../../../AGENTS.md) (`~/dev/hyperdrift/AGENTS.md`). Read it first; this file adds unanswered-specific context only.
>
> **Voice Covenant**: every user-facing surface, including drafted replies, inherits `meta/PHILOSOPHY.md` #8 "Speak to Enable" — enable, never diminish; strengths first.

## Overview

unanswered finds open-source asks nobody answered — maintainer-opened `help wanted` issues with no assignee and no comments — matches them to what the visitor knows, and drafts a first reply. Live at https://unanswered.hyperdrift.io (port 3015, per `infra/group_vars/apps.yml`). Built for the DEV Weekend Challenge: Generosity Edition; load the `contest` skill for submission or post-contest work.

## Product boundary

- **Nothing is posted for the user.** unanswered drafts; the person reads, edits, and posts. Never add a path that comments on GitHub on their behalf.
- A drafted reply acknowledges the specific ask, offers one concrete step, and promises nothing the user won't do.

## Stack

- Waku (React Server Components) with one client island (`src/components/ask-finder.tsx`)
- GitHub issue search in `src/lib/github.ts`; ask selection in `src/lib/asks.ts`; keyword → language mapping in `src/lib/languages.ts`
- Gemini through Vertex AI with a service account (`src/lib/google-auth.ts`, token minted with `node:crypto`, no SDK), falling back to the Gemini API key (`src/lib/gemini.ts`)
- MCP server in `mcp/server.ts`; health route `src/pages/_api/health.ts`
- pnpm today — npm migration debt: migrate the full package-manager contract before dependency-changing work (root `AGENTS.md` → Package Manager Standard)

## Commands

```bash
pnpm dev     # Waku dev server
pnpm test    # node --test on src/lib/*.test.ts
pnpm build   # waku build
pnpm mcp     # MCP server (reads .env)
```

Production runs `node --env-file=.env dist/serve-node.js`; secrets live in the infra vault (`infra/secrets/unanswered.env.prod`).
