/**
 * Cookie 工具：JWT token 的存取
 * 用于替代 localStorage 存储 token，提升安全性（可配合 httpOnly 等策略）
 */

const TOKEN_KEY = 'token';
const TOKEN_MAX_AGE_DAYS = 7; // 与后端 JWT_EXPIRES_IN 一致

/** 解析 cookie 字符串，返回 key 对应的 value */
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/** 设置 cookie */
function setCookie(name, value, maxAgeDays = TOKEN_MAX_AGE_DAYS) {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** 删除 cookie */
function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export const tokenCookie = {
  get: () => getCookie(TOKEN_KEY),
  set: (token, maxAgeDays = TOKEN_MAX_AGE_DAYS) => setCookie(TOKEN_KEY, token, maxAgeDays),
  remove: () => removeCookie(TOKEN_KEY),
};
