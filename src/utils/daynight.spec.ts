import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getQuadrantId,
  getQuadrantName,
  getQuadrantSublabel,
  isItemOverdue,
  isItemImpending,
  getDueStatusText,
  calculateSubtaskProgress,
} from './quadrant';
import { StorageService, SEED_TASKS, SEED_NOTES } from './storage';
import { extractTasksFromNoteWithAI } from './ai';
import { parseQuickCapture } from './parser';
import { TaskItem, SubTask, JournalNote } from '../types';

function createMockTask(partial: Partial<TaskItem>): TaskItem {
  return {
    id: 'mock_' + Math.random().toString(36).slice(2, 8),
    parentId: null,
    title: '测试任务',
    note: '',
    domain: 'work',
    status: 'todo',
    importance: null,
    urgency: null,
    dueAt: null,
    scheduledStart: null,
    scheduledEnd: null,
    tags: [],
    subtasks: [],
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    deletedAt: null,
    ...partial,
  };
}

// ==========================================
// Module 1: 四象限业务逻辑与边界测试
// ==========================================
test('TC-M1-01: 四象限 9 种组合与 null/undefined 边界判定', () => {
  // 1. 重要 + 紧急 -> Q1
  assert.equal(getQuadrantId(createMockTask({ importance: true, urgency: true })), 'q1');
  assert.equal(getQuadrantName('q1'), '立即做');
  assert.equal(getQuadrantSublabel('q1'), '重要 · 紧急');

  // 2. 重要 + 不紧急 -> Q2
  assert.equal(getQuadrantId(createMockTask({ importance: true, urgency: false })), 'q2');
  assert.equal(getQuadrantName('q2'), '规划做');
  assert.equal(getQuadrantSublabel('q2'), '重要 · 不紧急');

  // 3. 不重要 + 紧急 -> Q3
  assert.equal(getQuadrantId(createMockTask({ importance: false, urgency: true })), 'q3');
  assert.equal(getQuadrantName('q3'), '尽快处理');
  assert.equal(getQuadrantSublabel('q3'), '不重要 · 紧急');

  // 4. 不重要 + 不紧急 -> Q4
  assert.equal(getQuadrantId(createMockTask({ importance: false, urgency: false })), 'q4');
  assert.equal(getQuadrantName('q4'), '以后再做');
  assert.equal(getQuadrantSublabel('q4'), '不重要 · 不紧急');

  // 5. 待分类边界 (任意一项为 null 或 undefined 均为 unclassified)
  assert.equal(getQuadrantId(createMockTask({ importance: null, urgency: true })), 'unclassified');
  assert.equal(getQuadrantId(createMockTask({ importance: true, urgency: null })), 'unclassified');
  assert.equal(getQuadrantId(createMockTask({ importance: null, urgency: null })), 'unclassified');
  assert.equal(getQuadrantName('unclassified'), '待分类');
  assert.equal(getQuadrantSublabel('unclassified'), '未判断轻重');
});

// ==========================================
// Module 2: 待办截止时间、临期与超时判定边界测试
// ==========================================
test('TC-M2-01: 逾期状态 isItemOverdue 边界验证', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // 正常未完成逾期
  assert.equal(isItemOverdue(createMockTask({ dueAt: yesterday, status: 'todo' })), true);

  // 未到期
  assert.equal(isItemOverdue(createMockTask({ dueAt: tomorrow, status: 'todo' })), false);

  // 今天不算已超时
  assert.equal(isItemOverdue(createMockTask({ dueAt: today, status: 'todo' })), false);

  // 关键边界：已完成任务即使截止时间在过去，也绝不能被标记为已超时
  assert.equal(isItemOverdue(createMockTask({ dueAt: yesterday, status: 'done' })), false);
  assert.equal(isItemOverdue(createMockTask({ dueAt: yesterday, status: 'completed' })), false);

  // 关键边界：回收站删除项不标记超时
  assert.equal(isItemOverdue(createMockTask({ dueAt: yesterday, status: 'todo', deletedAt: new Date().toISOString() })), false);

  // 计划时段与截止日期独立：没有截止日期不记为逾期
  assert.equal(isItemOverdue(createMockTask({ scheduledEnd: yesterday + 'T18:00:00', dueAt: null })), false);
});

test('TC-M2-02: 临期预警 isItemImpending 边界验证', () => {
  const today = new Date().toISOString().slice(0, 10);
  const inTwoDays = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  const inTenDays = new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10);

  assert.equal(isItemImpending(createMockTask({ dueAt: today })), true);
  assert.equal(isItemImpending(createMockTask({ dueAt: inTwoDays })), true);
  assert.equal(isItemImpending(createMockTask({ dueAt: inTenDays })), false);

  // 已完成项绝不计入临期
  assert.equal(isItemImpending(createMockTask({ dueAt: today, status: 'done' })), false);
});

test('TC-M2-03: 截止状态标签文字与高亮 getDueStatusText', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const overdueRes = getDueStatusText(createMockTask({ dueAt: yesterday }));
  assert.equal(overdueRes.text, '已超时');
  assert.equal(overdueRes.isOverdue, true);

  const todayRes = getDueStatusText(createMockTask({ dueAt: today }));
  assert.equal(todayRes.text, '今日截止');
  assert.equal(todayRes.isOverdue, false);

  const doneRes = getDueStatusText(createMockTask({ dueAt: yesterday, status: 'done' }));
  assert.equal(doneRes.text, '已完成');
  assert.equal(doneRes.isOverdue, false);

  const noDateRes = getDueStatusText(createMockTask({ dueAt: null, scheduledEnd: null }));
  assert.equal(noDateRes.text, '');
  assert.equal(noDateRes.isOverdue, false);
});

// ==========================================
// Module 3: 子事项计算与极端边界测试
// ==========================================
test('TC-M3-01: 子事项进度 calculateSubtaskProgress 边界测试', () => {
  // 1. undefined 与 null 输入防御
  assert.deepEqual(calculateSubtaskProgress(undefined), { done: 0, completed: 0, total: 0, percentage: 0, percent: 0 });
  assert.deepEqual(calculateSubtaskProgress([]), { done: 0, completed: 0, total: 0, percentage: 0, percent: 0 });

  // 2. 100% 完成
  const allDone: SubTask[] = [
    { id: '1', title: 'A', done: true },
    { id: '2', title: 'B', done: true },
  ];
  assert.equal(calculateSubtaskProgress(allDone).percentage, 100);
  assert.equal(calculateSubtaskProgress(allDone).done, 2);

  // 3. 0% 完成
  const noneDone: SubTask[] = [
    { id: '1', title: 'A', done: false },
    { id: '2', title: 'B', done: false },
  ];
  assert.equal(calculateSubtaskProgress(noneDone).percentage, 0);

  // 4. 四舍五入取整 (1/3 = 33%)
  const oneThird: SubTask[] = [
    { id: '1', title: 'A', done: true },
    { id: '2', title: 'B', done: false },
    { id: '3', title: 'C', done: false },
  ];
  assert.equal(calculateSubtaskProgress(oneThird).percentage, 33);
  assert.equal(calculateSubtaskProgress(oneThird).total, 3);
});

// ==========================================
// Module 4: 日历系统与跨天事项区间算法测试
// ==========================================
test('TC-M4-01: 日历跨天事项 (inDay) 覆盖范围边界计算', () => {
  const inDay = (task: TaskItem, dateStr: string) => {
    if (!task.scheduledStart || !task.scheduledEnd) return false;
    return task.scheduledStart.slice(0, 10) <= dateStr && task.scheduledEnd.slice(0, 10) >= dateStr;
  };

  const multiDayTask = createMockTask({
    scheduledStart: '2026-10-26T09:00:00',
    scheduledEnd: '2026-10-29T18:00:00',
  });

  // 区间外（前一天）
  assert.equal(inDay(multiDayTask, '2026-10-25'), false);
  // 开始日
  assert.equal(inDay(multiDayTask, '2026-10-26'), true);
  // 中间日
  assert.equal(inDay(multiDayTask, '2026-10-27'), true);
  assert.equal(inDay(multiDayTask, '2026-10-28'), true);
  // 结束日
  assert.equal(inDay(multiDayTask, '2026-10-29'), true);
  // 区间外（后一天）
  assert.equal(inDay(multiDayTask, '2026-10-30'), false);

  // 边界：跨月事项 (10-30 至 11-02)
  const crossMonthTask = createMockTask({
    scheduledStart: '2026-10-30T10:00:00',
    scheduledEnd: '2026-11-02T12:00:00',
  });
  assert.equal(inDay(crossMonthTask, '2026-10-31'), true);
  assert.equal(inDay(crossMonthTask, '2026-11-01'), true);
  assert.equal(inDay(crossMonthTask, '2026-11-03'), false);

  // 边界：时间倒置防御 (start > end)
  const invertedTask = createMockTask({
    scheduledStart: '2026-10-29T10:00:00',
    scheduledEnd: '2026-10-26T12:00:00',
  });
  // 倒置时不应包含中间日期
  assert.equal(inDay(invertedTask, '2026-10-27'), false);
});

// ==========================================
// Module 5: 本地数据存储、导入导出与容灾恢复测试
// ==========================================
test('TC-M5-01: 数据持久化与初始种子加载', () => {
  StorageService.resetToDemoData();
  const { tasks, notes } = StorageService.loadAllData();

  assert.ok(Array.isArray(tasks) && tasks.length > 0);
  assert.ok(Array.isArray(notes) && notes.length > 0);
  assert.equal(tasks[0].id, SEED_TASKS[0].id);
  assert.equal(notes[0].id, SEED_NOTES[0].id);
});

test('TC-M5-02: 数据增删改查与内存缓存同步', () => {
  const testTask = createMockTask({ id: 't_persist_test', title: '持久化测试' });
  const currentTasks = StorageService.loadAllData().tasks;
  StorageService.saveTasks([testTask, ...currentTasks]);

  const reloaded = StorageService.loadAllData().tasks;
  assert.equal(reloaded[0].id, 't_persist_test');
  assert.equal(reloaded[0].title, '持久化测试');
});

test('TC-M5-03: 全量备份数据导出与导入兼容性 (兼容旧版 items 与新版 tasks 字段)', async () => {
  // 1. 标准导入
  const mockBackupJson = JSON.stringify({
    version: '1.0',
    exportedAt: '2026-10-27T10:00:00.000Z',
    tasks: [createMockTask({ id: 'imported_1', title: '备份导入事项' })],
    notes: [{ id: 'n_imp', title: '备份导入笔记', text: '内容', domain: 'work', type: '随手记', date: '2026-10-27', links: [], updatedAt: '', deletedAt: null }],
  });

  const imported = await StorageService.importFullBackup(mockBackupJson);
  assert.equal(imported.items.length, 1);
  assert.equal(imported.items[0].id, 'imported_1');
  assert.equal(imported.journals.length, 1);

  // 2. 兼容旧版 items / journals 字段
  const legacyBackupJson = JSON.stringify({
    version: '0.9',
    items: [createMockTask({ id: 'legacy_1', title: '旧版事项' })],
    journals: [{ id: 'legacy_n', title: '旧版笔记', text: '旧版正文', domain: 'life', type: '复盘', date: '2026-10-27', links: [], updatedAt: '', deletedAt: null }],
  });

  const legacyImported = await StorageService.importFullBackup(legacyBackupJson);
  assert.equal(legacyImported.items.length, 1);
  assert.equal(legacyImported.items[0].id, 'legacy_1');
  assert.equal(legacyImported.journals[0].id, 'legacy_n');
});

// ==========================================
// Module 6: 快速采集智能解析 (NLP Parser) 测试
// ==========================================
test('TC-M6-01: 自然语言快捷输入解析 (标签、领域、紧急度与时间)', () => {
  const fixedNow = new Date('2026-10-27T09:00:00+08:00');

  // 解析普通输入
  const res1 = parseQuickCapture('买咖啡豆', fixedNow, 'work');
  assert.equal(res1.title, '买咖啡豆');
  assert.equal(res1.domain, 'work');

  // 解析带标签、领域与紧急词
  const res2 = parseQuickCapture('生活: 健身房锻炼 #运动 #健康 很急', fixedNow, 'work');
  assert.equal(res2.domain, 'life');
  assert.equal(res2.urgency, true);
  assert.deepEqual(res2.tags, ['运动', '健康']);
  assert.equal(res2.title, '健身房锻炼');

  // 解析带日期时间的输入
  const res3 = parseQuickCapture('明天下午三点 跟王工对接口 重要', fixedNow, 'work');
  assert.equal(res3.importance, true);
  assert.ok(res3.dueAt !== null);
  const parsedD = new Date(res3.dueAt!);
  assert.equal(parsedD.getDate(), 28);
  assert.equal(parsedD.getHours(), 15);
});

// ==========================================
// Module 7: AI 提炼与富文本规则引擎边界测试
// ==========================================
test('TC-M7-01: 笔记提取待办 extractTasksFromNoteWithAI 规则引擎回退测试', async () => {
  const noteWithBullets: JournalNote = {
    id: 'n_test_bullets',
    title: '架构评审纪要',
    text: '会议要点如下：\n• 确认接口字段表与定义\n• 下一步核对压测指标\n- 输出验收自测用例',
    domain: 'work',
    type: '会议记录',
    date: '2026-10-27',
    links: [],
    updatedAt: '',
    deletedAt: null,
  };

  const tasks = await extractTasksFromNoteWithAI(noteWithBullets);
  assert.ok(tasks.length >= 3);
  assert.ok(tasks.some((t) => t.title?.includes('确认接口字段表与定义')));
  assert.ok(tasks.some((t) => t.title?.includes('核对压测指标')));
  assert.ok(tasks.some((t) => t.title?.includes('输出验收自测用例')));
  assert.equal(tasks[0].domain, 'work');
});

// ==========================================
// Module 8: 时间选择器本地时间与 ISO 格式双向一致性测试
// ==========================================
import { toDatetimeLocalString, fromDatetimeLocalString } from '../components/TaskDetailDrawer';

test('TC-M8-01: 时间选择器输入与展示保持绝对一致，避免时区偏移导致的选择值漂移', () => {
  // 用户在 datetime-local 选择 2026-10-27 10:00
  const userPicked = '2026-10-27T10:00';
  const isoSaved = fromDatetimeLocalString(userPicked);
  assert.ok(isoSaved !== null);

  // 重新加载展示
  const displayed = toDatetimeLocalString(isoSaved);
  assert.equal(displayed, userPicked, '展示的值必须与用户选择的值完全一致，无时区跳跃');

  // 空值或 null
  assert.equal(toDatetimeLocalString(null), '');
  assert.equal(toDatetimeLocalString(''), '');
  assert.equal(fromDatetimeLocalString(''), null);
});
