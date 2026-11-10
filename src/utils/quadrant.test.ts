import test from 'node:test';
import assert from 'node:assert/strict';
import { getQuadrantId, isItemImpending, isItemOverdue, calculateSubtaskProgress } from './quadrant';
import { TaskItem, SubTask } from '../types';

function createMockItem(partial: Partial<TaskItem>): TaskItem {
  return {
    id: 'test-1',
    parentId: null,
    title: '测试事项',
    note: '',
    domain: 'work',
    status: 'todo',
    importance: null,
    urgency: null,
    dueAt: null,
    dueAllDay: false,
    scheduledStart: null,
    scheduledEnd: null,
    tags: [],
    subtasks: [],
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    deletedAt: null,
    ...partial,
  };
}

test('quadrant classification logic', () => {
  // unclassified if either is null
  assert.equal(getQuadrantId(createMockItem({ importance: null, urgency: true })), 'unclassified');
  assert.equal(getQuadrantId(createMockItem({ importance: true, urgency: null })), 'unclassified');
  assert.equal(getQuadrantId(createMockItem({ importance: null, urgency: null })), 'unclassified');

  // Q1: 重要 + 紧急
  assert.equal(getQuadrantId(createMockItem({ importance: true, urgency: true })), 'q1');

  // Q2: 重要 + 不紧急
  assert.equal(getQuadrantId(createMockItem({ importance: true, urgency: false })), 'q2');

  // Q3: 不重要 + 紧急
  assert.equal(getQuadrantId(createMockItem({ importance: false, urgency: true })), 'q3');

  // Q4: 不重要 + 不紧急
  assert.equal(getQuadrantId(createMockItem({ importance: false, urgency: false })), 'q4');
});

test('calculateSubtaskProgress computes correct fraction and percentage', () => {
  const subtasks: SubTask[] = [
    { id: 's1', title: '子任务1', done: true },
    { id: 's2', title: '子任务2', done: true },
    { id: 's3', title: '子任务3', done: false },
    { id: 's4', title: '子任务4', done: false },
  ];

  const progress = calculateSubtaskProgress(subtasks);
  assert.equal(progress.total, 4);
  assert.equal(progress.done, 2);
  assert.equal(progress.percentage, 50);
});

