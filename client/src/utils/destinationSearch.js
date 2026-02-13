import { pinyin } from 'pinyin-pro';
import { parseLocalDate } from './dateUtils';

/**
 * 判断文本是否匹配关键字（支持中文、拼音全拼、拼音首字母）
 */
export function matchKeyword(text, keyword) {
  if (!keyword || !keyword.trim()) return true;
  const kw = String(keyword).trim().toLowerCase();
  const t = String(text).trim();
  if (!t) return false;
  if (t.toLowerCase().includes(kw)) return true;
  const py = pinyin(t, { toneType: 'none', separator: '' }).toLowerCase();
  if (py.includes(kw)) return true;
  const pyFirst = pinyin(t, { toneType: 'none', pattern: 'first', separator: '' }).toLowerCase();
  return pyFirst.includes(kw);
}

/**
 * 格式化最近搜索的子标题
 */
export function formatRecentSubtitle(record) {
  const parts = [];
  if (record.checkIn && record.checkOut) {
    const d1 = parseLocalDate(record.checkIn);
    const d2 = parseLocalDate(record.checkOut);
    if (d1 && d2) {
      parts.push(`${d1.getMonth() + 1}月${d1.getDate()}日-${d2.getMonth() + 1}月${d2.getDate()}日`);
    }
  }
  if (record.rooms != null) parts.push(`${record.rooms}间`);
  const adults = record.adults ?? 0;
  if (adults != null) parts.push(`${adults}位`);
  return parts.join(',');
}
