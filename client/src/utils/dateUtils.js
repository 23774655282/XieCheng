/**
 * 日期工具：使用本地时间，避免 toISOString / new Date("YYYY-MM-DD") 的时区问题
 */

/** 将 Date 格式化为本地 YYYY-MM-DD */
export function formatLocalDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 将 YYYY-MM-DD 解析为本地 Date，不受时区影响 */
export function parseLocalDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, day] = parts;
  const d = new Date(y, m - 1, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** 获取今天日期的本地 YYYY-MM-DD（不用 toISOString，避免 UTC 偏差） */
export function getTodayLocal() {
  const d = new Date();
  return formatLocalDate(d);
}

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 格式化为 "02.13" 紧凑月日 */
export function formatDateCompact(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day}`;
}

/** 格式化为 "2月13日" 仅月日 */
export function formatDateShort(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 日期后缀：(今天) 或 (周六) */
export function formatDateSuffix(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  const today = new Date();
  if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
    return '(今天)';
  }
  return `(${WEEKDAY_ZH[d.getDay()]})`;
}

/** 格式化为 "2月21日周六" 用于展示 */
export function formatDateWithWeekday(d) {
  if (!d || !(d instanceof Date) || isNaN(d)) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAY_ZH[d.getDay()];
  return `${m}月${day}日${w}`;
}
