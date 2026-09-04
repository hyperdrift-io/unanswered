import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupe } from './asks.ts';
import { buildQuery } from './github.ts';

const c = (id: number) =>
  ({ id, repo: 'a/b', number: id, title: '', body: '', url: '', labels: [], language: 'Go', author: '', createdAt: '', daysUnanswered: 0 });

test('dedupe keeps the first of each id', () => {
  assert.deepEqual(dedupe([c(1), c(2), c(1)]).map((x) => x.id), [1, 2]);
});

test('query asks for unanswered help-wanted issues in one language', () => {
  const q = buildQuery('C#');
  assert.match(q, /label:"help wanted"/);
  assert.match(q, /comments:0/);
  assert.match(q, /no:assignee/);
  assert.match(q, /language:"C#"/);
  assert.match(q, /created:\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}/);
});
