*This is a submission for [Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03)*

## What I Built

Andrea has been waiting 174 days for someone to reply to his issue. He asked nicely. He labelled it *help wanted*. Someone who knows Rust could answer him tonight in ten minutes.

They just don't know he asked.

There are 26,034 issues like his right now. People haven't stopped caring about open source. The ask and the person who could answer it simply never meet.

**unanswered** introduces them.

Tell it what you're good at. It finds the maintainers you could genuinely help, explains in plain words what each one needs, and drafts an opening line, so the first step isn't the hard one.

Then it hands you the pen. You write the reply. You send it. Your name, your words. All the app did was make the introduction.

## Demo

**[unanswered.hyperdrift.io](https://unanswered.hyperdrift.io)**

Try one, no typing needed:

- [React and TypeScript](https://unanswered.hyperdrift.io/?know=React+and+TypeScript%2C+Node+backends%2C+Postgres.)
- [Python and Rust](https://unanswered.hyperdrift.io/?know=Python+and+Django%2C+some+Rust.+Data+pipelines+and+CLI+tools.)
- [Go and Java](https://unanswered.hyperdrift.io/?know=Go+and+Kubernetes+operators%2C+some+Java.+Backend+and+infra.)

[UPLOAD demo.gif HERE — delete this line]

## Code

{% github hyperdrift-io/unanswered %}

## How I Built It

Two decisions carry it.

**Only real asks count.** GitHub tells you who opened an issue: the repo's owner, a member, a collaborator. Keep those, add three weeks of silence and zero replies, and every result is a real person who genuinely asked.

**Gemini reads so you don't have to guess.** An issue is written in someone else's private language. Gemini turns it into one plain sentence about what they need, says why it fits you, and drafts a reply that offers one concrete next step and no promises. That is the part a search box can never do.

<details>
<summary>Engineering notes</summary>

**For anyone using GitHub issue search:** `stars:` is not a supported qualifier there, and GitHub matches the number against the issue number instead of rejecting it. `stars:>20` returns only issues numbered 20. Repo quality has to come from who asked and how recently the issue was touched.

**Rate limits as design.** GitHub's secondary limit trips on two concurrent searches, so searches run one at a time behind a lock, cache for thirty minutes, and eight languages warm at boot. The three example searches cache for a day.

**Gemini in production.** 3.6 Flash returns a thought-signature part before the text part, so read every non-thought part. The model is reached through Vertex AI with a service-account token minted in about forty lines of `node:crypto`; if that door shuts, the page still shows the maintainers, unranked, with an honest line.

**Stack.** Waku (React Server Components), two typed server functions, one client island, pure cascading CSS, plain `fetch`. Seven dependencies, no database, no accounts. An MCP server exposes the same two acts for Claude or ChatGPT.

</details>

## Prize Categories

Best Use of Google AI
