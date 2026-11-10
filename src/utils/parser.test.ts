import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickCapture } from './parser';

test('A01: parses simple title without fictional date or importance', () => {
  const result = parseQuickCapture('买咖啡豆', new Date('2026-10-25T10:00:00Z'), 'work');
  assert.equal(result.title, '买咖啡豆');
  assert.equal(result.dueAt, null);
  assert.equal(result.importance, undefined);
  assert.equal(result.urgency, undefined);
  assert.equal(result.domain, 'work');
});

test('A02: parses "明天下午三点 跟王哥对需求 重要"', () => {
  const fixedNow = new Date('2026-10-25T10:00:00+08:00');
  const result = parseQuickCapture('明天下午三点 跟王哥对需求 重要', fixedNow, 'work');

  assert.equal(result.title, '跟王哥对需求');
  assert.equal(result.importance, true);
  assert.ok(result.dueAt !== null);

  const parsedDate = new Date(result.dueAt!);
  assert.equal(parsedDate.getDate(), 26);
  assert.equal(parsedDate.getHours(), 15);
  assert.equal(parsedDate.getMinutes(), 0);

  // Check generated pills
  const impPill = result.pills.find(p => p.type === 'importance');
  assert.ok(impPill);
  assert.equal(impPill?.label, '重要');

  const duePill = result.pills.find(p => p.type === 'due');
  assert.ok(duePill);
});

test('A03: ignores pills when user clicks cross', () => {
  const fixedNow = new Date('2026-10-25T10:00:00+08:00');
  const ignored = new Set(['imp_true']);
  const result = parseQuickCapture('明天下午三点 跟王哥对需求 重要', fixedNow, 'work', ignored);

  assert.equal(result.importance, undefined);
  // Title retains or handles the non-pill text properly
});

test('parses domain prefix and tags', () => {
  const fixedNow = new Date('2026-10-25T10:00:00+08:00');
  const result = parseQuickCapture('生活: 健身房锻炼 #运动 #健康 很急', fixedNow, 'work');

  assert.equal(result.domain, 'life');
  assert.equal(result.urgency, true);
  assert.deepEqual(result.tags, ['运动', '健康']);
  assert.equal(result.title, '健身房锻炼');
});
