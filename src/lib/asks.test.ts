import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupe, onePerRepo, normalise } from './asks.ts';
import { buildQuery, isMaintainer } from './github.ts';
import { guessLanguages } from './languages.ts';

const c = (id: number, repo = 'a/b') =>
  ({ id, repo, number: id, title: '', body: '', url: '', labels: [], language: 'Go', author: '', association: 'OWNER', createdAt: '', daysUnanswered: 0 });

test('dedupe keeps the first of each id', () => {
  assert.deepEqual(dedupe([c(1), c(2), c(1)]).map((x) => x.id), [1, 2]);
});

test('one ask per repo', () => {
  assert.deepEqual(onePerRepo([c(1, 'x/y'), c(2, 'x/y'), c(3, 'z/w')]).map((x) => x.id), [1, 3]);
});

test('query asks for unanswered help-wanted issues in one language', () => {
  const q = buildQuery('C#');
  assert.match(q, /label:"help wanted"/);
  assert.match(q, /comments:0/);
  assert.match(q, /no:assignee/);
  assert.match(q, /language:"C#"/);
  assert.match(q, /created:\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}/);
});

test('only the people who run the repo count as maintainers', () => {
  assert.equal(isMaintainer('OWNER'), true);
  assert.equal(isMaintainer('MEMBER'), true);
  assert.equal(isMaintainer('COLLABORATOR'), true);
  assert.equal(isMaintainer('CONTRIBUTOR'), false);
  assert.equal(isMaintainer('NONE'), false);
});

test('languages come from the words people use for their stack', () => {
  assert.deepEqual(guessLanguages('React and TypeScript, Node backends, Postgres, a bit of Go.'), ['TypeScript', 'Go']);
  assert.deepEqual(guessLanguages('Python and Django, some Rust. Data pipelines and CLI tools.'), ['Python', 'Rust']);
  assert.deepEqual(guessLanguages('Go and Kubernetes operators, some Java. Backend and infra.'), ['Go', 'Java']);
  assert.deepEqual(guessLanguages('I do embedded audio DSP'), ['C++']);
  assert.deepEqual(guessLanguages('mostly gardening'), []);
});

test('normalise trims, collapses whitespace and caps length', () => {
  assert.equal(normalise('  a   b \n c '), 'a b c');
  assert.equal(normalise('x'.repeat(700)).length, 600);
});
