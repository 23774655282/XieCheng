import { pinyin } from 'pinyin-pro';
import { parseLocalDate } from './dateUtils';
import { domesticHotCities, overseasHotCities } from '../assets/assets';

/**
 * 判断目的地是否为城市名（城市可手打或选择后直接提交；具体地点须从联想选择）
 */
export function isCity(destination, cityOptions = []) {
  const d = String(destination || '').trim();
  if (!d) return false;
  const cities = [...domesticHotCities, ...overseasHotCities, ...(cityOptions || [])];
  const normalized = d.replace(/[市区县省]$/, '');
  return cities.some((c) => c === d || c === normalized || normalized === c);
}

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
  const roomsNum = record.rooms != null ? Number(record.rooms) : null;
  if (roomsNum != null && roomsNum >= 1) parts.push(`${roomsNum}间`);
  const adultsNum = record.adults != null ? Number(record.adults) : null;
  if (adultsNum != null && adultsNum >= 1) parts.push(`${adultsNum}位`);
  return parts.join(',');
}
