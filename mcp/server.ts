// MCP server over stdio. The same two acts as the page, for any agent:
// find the asks this person can answer, draft the first reply. Nothing posts.
//
//   pnpm mcp            (needs GEMINI_API_KEY, optional GITHUB_TOKEN in .env)
//
// Claude Desktop / Claude Code config:
//   { "mcpServers": { "unanswered": { "command": "node",
//       "args": ["--env-file=.env", "--experimental-strip-types", "mcp/server.ts"],
//       "cwd": "/path/to/unanswered" } } }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { findAsks } from '../src/lib/asks.ts';
import { pickAndDraft } from '../src/lib/gemini.ts';

const server = new McpServer({ name: 'unanswered', version: '0.2.0' });

server.registerTool(
  'find_unanswered_asks',
  {
    title: 'Find the maintainers you can help',
    description:
      'Open-source issues labelled "help wanted", opened by the people who run the repo, where nobody has replied for three weeks or more, matched to what the person knows. Returns up to five asks, each with what the maintainer wants, a one-line why-you and a drafted first reply. Use when someone wants to give time to open source and does not know where. Do not use to auto-post: the person reads, edits and posts the reply themselves.',
    inputSchema: {
      what_you_know: z.string().min(3).max(600).describe('Languages, stacks, domains, in the person\'s own words'),
      max: z.number().int().min(1).max(8).default(5),
    },
  },
  async ({ what_you_know, max }) => {
    const r = await findAsks(what_you_know, max);
    if (r.error) return { content: [{ type: 'text', text: r.error }] };
    const lines = r.asks.map(
      (a) =>
        `### ${a.repo} #${a.number} — ${a.title}\n${a.url}\n${a.daysUnanswered} days without a reply · asked by ${a.author} (${a.association.toLowerCase()})\nWhat they want: ${a.asking}\nWhy you: ${a.whyYou}\n\nDraft reply:\n${a.reply}`,
    );
    const head = r.asks.length
      ? `${r.candidates.length} maintainers asked in ${r.languages.join(' and ')} and nobody replied; these ${r.asks.length} fit.`
      : 'Our scan found no ask that fits yet. Name a language or two and try again.';
    return { content: [{ type: 'text', text: [head, ...lines].join('\n\n') }] };
  },
);

server.registerTool(
  'draft_first_reply',
  {
    title: 'Draft a first reply to a specific ask',
    description:
      'Given one issue (repo, title, body) and what the person knows, say what the maintainer wants and draft the first comment: acknowledge the ask, offer one concrete step, promise nothing. For the person to edit and post themselves.',
    inputSchema: {
      what_you_know: z.string().min(3).max(600),
      repo: z.string().describe('owner/name'),
      title: z.string(),
      body: z.string().max(4000).default(''),
    },
  },
  async ({ what_you_know, repo, title, body }) => {
    const [pick] = await pickAndDraft(
      what_you_know,
      [{ id: 1, repo, title, body, labels: ['help wanted'], daysUnanswered: 21 }],
      1,
    );
    return {
      content: [
        {
          type: 'text',
          text: pick
            ? `What they want: ${pick.asking}\nWhy you: ${pick.whyYou}\n\nDraft reply:\n${pick.reply}`
            : 'This one needs context you cannot have from outside the repo. Better to leave it for someone closer.',
        },
      ],
    };
  },
);

await server.connect(new StdioServerTransport());
