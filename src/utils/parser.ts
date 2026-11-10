import { ParsedQuickCapture } from '../types';

/**
 * Parses natural language input for quick capture.
 * Designed to execute locally in < 50ms without external API calls.
 */
export function parseQuickCapture(
  input: string,
  nowDate: Date = new Date(),
  currentDomain: 'work' | 'life' = 'work',
  ignoredPillIds: Set<string> = new Set()
): ParsedQuickCapture {
  let text = input.trim();
  const pills: ParsedQuickCapture['pills'] = [];

  let domain: 'work' | 'life' | undefined = undefined;
  let importance: boolean | null | undefined = undefined;
  let urgency: boolean | null | undefined = undefined;
  let dueAt: string | null = null;
  let dueAllDay = false;
  let isEstimatedTime = false;
  let parentPlanName: string | undefined = undefined;
  const tags: string[] = [];

  // 1. Prefix domain: 工作: or 生活:
  const domainMatch = text.match(/^(工作|生活)[:：]\s*/);
  if (domainMatch) {
    const rawVal = domainMatch[1];
    const domVal = rawVal === '工作' ? 'work' : 'life';
    const pillId = 'dom_' + domVal;
    if (!ignoredPillIds.has(pillId)) {
      domain = domVal;
      text = text.slice(domainMatch[0].length).trim();
      pills.push({
        id: pillId,
        type: 'domain',
        label: domVal === 'work' ? '工作域' : '生活域',
        value: domVal,
      });
    }
  }

  // 2. Parent plan link: @计划名
  const parentMatch = text.match(/@([^\s#]+)/);
  if (parentMatch) {
    const pillId = 'parent_' + parentMatch[1];
    if (!ignoredPillIds.has(pillId)) {
      parentPlanName = parentMatch[1];
      text = text.replace(parentMatch[0], ' ').trim();
      pills.push({
        id: pillId,
        type: 'parent',
        label: `@${parentPlanName}`,
        value: parentPlanName,
      });
    }
  }

  // 3. Tags: #标签
  const tagMatches = text.matchAll(/#([^\s#]+)/g);
  for (const match of Array.from(tagMatches)) {
    const tagName = match[1];
    const pillId = 'tag_' + tagName;
    if (!ignoredPillIds.has(pillId)) {
      if (!tags.includes(tagName) && tags.length < 10) {
        tags.push(tagName);
        pills.push({
          id: pillId,
          type: 'tag',
          label: `#${tagName}`,
          value: tagName,
        });
      }
      text = text.replace(match[0], ' ').trim();
    }
  }

  // 4. Importance: 不重要 before 重要
  if (!ignoredPillIds.has('imp_false') && /不重要/.test(text)) {
    importance = false;
    text = text.replace(/不重要/, ' ').trim();
    pills.push({
      id: 'imp_false',
      type: 'importance',
      label: '不重要',
      value: false,
    });
  } else if (!ignoredPillIds.has('imp_true') && /重要/.test(text)) {
    importance = true;
    text = text.replace(/重要/, ' ').trim();
    pills.push({
      id: 'imp_true',
      type: 'importance',
      label: '重要',
      value: true,
    });
  }

  // 5. Urgency: 不急 / 不紧急 before 急
  if (!ignoredPillIds.has('urg_false') && /(不急|不紧急)/.test(text)) {
    urgency = false;
    text = text.replace(/(不急|不紧急)/, ' ').trim();
    pills.push({
      id: 'urg_false',
      type: 'urgency',
      label: '不紧急',
      value: false,
    });
  } else if (!ignoredPillIds.has('urg_true') && /(很急|紧急|很紧急|特别急|非常急|特急|急)/.test(text)) {
    urgency = true;
    text = text.replace(/(很急|紧急|很紧急|特别急|非常急|特急|急)/, ' ').trim();
    pills.push({
      id: 'urg_true',
      type: 'urgency',
      label: '紧急',
      value: true,
    });
  }

  // 6. Dates and times
  // Target date calculation
  let targetDate: Date | null = null;
  let dateTextMatched = '';

  const now = new Date(nowDate);
  const year = now.getFullYear();

  // Relative dates (Chinese words do not require surrounding whitespace)
  if (/今天/.test(text)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateTextMatched = '今天';
    text = text.replace(/今天/, ' ').trim();
  } else if (/明天/.test(text)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    dateTextMatched = '明天';
    text = text.replace(/明天/, ' ').trim();
  } else if (/后天/.test(text)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    dateTextMatched = '后天';
    text = text.replace(/后天/, ' ').trim();
  } else if (/大后天/.test(text)) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
    dateTextMatched = '大后天';
    text = text.replace(/大后天/, ' ').trim();
  } else {
    // Weekday match: 下周一 ~ 下周日 or 周一 ~ 周日 / 星期一 ~ 星期日
    const weekMatch = text.match(/(^|\s)(下周|下星期|本周|这周|周|星期)([一二三四五六日天7123456])(\s|$)/);
    if (weekMatch) {
      const isNextWeek = weekMatch[2] === '下周' || weekMatch[2] === '下星期';
      const dayMap: Record<string, number> = {
        '一': 1, '1': 1,
        '二': 2, '2': 2,
        '三': 3, '3': 3,
        '四': 4, '4': 4,
        '五': 5, '5': 5,
        '六': 6, '6': 6,
        '日': 0, '天': 0, '7': 0,
      };
      const targetDay = dayMap[weekMatch[3]];
      const currentDay = now.getDay();
      let diff = targetDay - currentDay;
      if (isNextWeek) {
        diff += 7;
      } else if (diff <= 0) {
        // If "周三" and today is Thursday, assume next week Wednesday
        diff += 7;
      }
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
      dateTextMatched = weekMatch[0].trim();
      text = text.replace(weekMatch[0], ' ').trim();
    } else {
      // Month-day match: 10/28 or 10月28日 or 10-28
      const mdMatch = text.match(/(^|\s)(\d{1,2})[月\/-](\d{1,2})日?(\s|$)/);
      if (mdMatch) {
        const m = parseInt(mdMatch[2], 10) - 1;
        const d = parseInt(mdMatch[3], 10);
        targetDate = new Date(year, m, d);
        if (targetDate.getTime() < now.getTime() - 86400000 * 30) {
          // If in the past by > 30 days, guess next year
          targetDate.setFullYear(year + 1);
        }
        dateTextMatched = mdMatch[0].trim();
        text = text.replace(mdMatch[0], ' ').trim();
      }
    }
  }

  // Specific time match: 15:00, 下午3点, 下午三点, 晚8点, 晚上8点, 上午10:30, etc.
  let targetHour: number | null = null;
  let targetMinute = 0;
  let timeTextMatched = '';

  const cnNumMap: Record<string, number> = {
    '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12,
  };

  const timeMatch = text.match(/(^|\s)(早上|早晨|上午|中午|下午|傍晚|晚上|晚)?\s*([一二两三四五六七八九十\d]{1,2})(?:[:：点时](\d{1,2}|半)?分?)?(\s|$)/);
  if (timeMatch && targetDate) {
    const period = timeMatch[2];
    const rawH = timeMatch[3];
    let h = cnNumMap[rawH] !== undefined ? cnNumMap[rawH] : parseInt(rawH, 10);
    let m = 0;
    if (timeMatch[4] === '半') {
      m = 30;
    } else if (timeMatch[4]) {
      m = parseInt(timeMatch[4], 10);
    }

    if (!isNaN(h)) {
      if ((period === '下午' || period === '晚上' || period === '晚' || period === '傍晚') && h < 12) {
        h += 12;
      } else if (period === '中午' && h < 11) {
        h += 12;
      }
      targetHour = h;
      targetMinute = m;
      timeTextMatched = timeMatch[0].trim();
      text = text.replace(timeMatch[0], ' ').trim();
    }
  }

  // Rough time: 上午 / 下午 / 晚上 without specific hour
  if (targetHour === null && targetDate) {
    if (/(^|\s)上午(\s|$)/.test(text)) {
      targetHour = 9;
      targetMinute = 0;
      isEstimatedTime = true;
      timeTextMatched = '上午';
      text = text.replace(/(^|\s)上午(\s|$)/, ' ').trim();
    } else if (/(^|\s)下午(\s|$)/.test(text)) {
      targetHour = 15;
      targetMinute = 0;
      isEstimatedTime = true;
      timeTextMatched = '下午';
      text = text.replace(/(^|\s)下午(\s|$)/, ' ').trim();
    } else if (/(^|\s)(晚上|晚)(\s|$)/.test(text)) {
      targetHour = 20;
      targetMinute = 0;
      isEstimatedTime = true;
      timeTextMatched = '晚上';
      text = text.replace(/(^|\s)(晚上|晚)(\s|$)/, ' ').trim();
    }
  }

  // Build dueAt date string
  if (targetDate) {
    const pillId = 'due_' + dateTextMatched + '_' + timeTextMatched;
    if (!ignoredPillIds.has('due_date')) {
      if (targetHour !== null) {
        targetDate.setHours(targetHour, targetMinute, 0, 0);
        dueAt = targetDate.toISOString();
        dueAllDay = false;
      } else {
        targetDate.setHours(23, 59, 59, 0);
        dueAt = targetDate.toISOString();
        dueAllDay = true;
      }

      // Format human label
      const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateStr = String(targetDate.getDate()).padStart(2, '0');
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dayStr = dayNames[targetDate.getDay()];
      let label = `${monthStr}-${dateStr} ${dayStr}`;
      if (targetHour !== null) {
        const hourStr = String(targetHour).padStart(2, '0');
        const minStr = String(targetMinute).padStart(2, '0');
        label += ` ${hourStr}:${minStr}`;
        if (isEstimatedTime) {
          label += ' (推测)';
        }
      }

      pills.push({
        id: 'due_date',
        type: 'due',
        label,
        value: dueAt,
        isEstimated: isEstimatedTime,
      });
    }
  }

  // Clean extra spaces
  text = text.replace(/\s+/g, ' ').trim();

  // If text is empty after stripping all tags, fall back to input
  const title = text || input.trim();

  return {
    rawTitle: input,
    title,
    domain: domain || currentDomain,
    dueAt,
    dueAllDay,
    isEstimatedTime,
    importance,
    urgency,
    tags,
    parentPlanName,
    pills,
  };
}
