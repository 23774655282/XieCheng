/**
 * API 请求封装
 * 开发时通过 Vite 代理 /api -> localhost:3000，生产环境用 VITE_API_BASE
 */
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<ApiResponse<T>> {
  const { token, ...init } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...init, headers });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!res.ok) {
    throw new Error(json.message ?? `HTTP ${res.status}`);
  }
  return json;
}

// ========== 认证 ==========
export const authApi = {
  register: (body: { username: string; password: string; role: 'merchant' | 'admin' }) =>
    request<{ userId: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<{ token: string; role: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ========== 用户端酒店（公开） ==========
export const hotelsApi = {
  list: (params: {
    city?: string;
    keyword?: string;
    star?: number;
    priceMin?: number;
    priceMax?: number;
    tags?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v));
    });
    return request<{
      list: { id: string; nameZh: string; nameEn: string; address: string; star: number; minPrice: number; tags: string[]; images: string[] }[];
      page: number;
      pageSize: number;
      total: number;
    }>(`/api/hotels?${q}`);
  },
  detail: (id: string) =>
    request<{
      id: string;
      nameZh: string;
      nameEn: string;
      address: string;
      star: number;
      openedAt: string;
      tags: string[];
      images: string[];
      nearby?: { spots: string[]; traffic: string[]; malls: string[] };
    }>(`/api/hotels/${id}`),
  rooms: (id: string) =>
    request<{ list: { name: string; price: number; stock: number }[] }>(`/api/hotels/${id}/rooms`),
};

// ========== 商户 ==========
export const merchantApi = {
  createHotel: (body: {
    nameZh: string;
    nameEn: string;
    address: string;
    star: number;
    openedAt: string;
    roomTypes: { name: string; price: number; stock?: number }[];
  }, token: string) =>
    request<{ id: string; status: string }>('/api/merchant/hotels', {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),
  listHotels: (params: { status?: string; page?: number; pageSize?: number }, token: string) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v));
    });
    return request<{
      list: { id: string; nameZh: string; nameEn: string; address: string; star: number; status: string; rejectReason?: string }[];
      page: number;
      pageSize: number;
      total: number;
    }>(`/api/merchant/hotels?${q}`, { token });
  },
  getHotel: (id: string, token: string) =>
    request<{
      id: string;
      nameZh: string;
      nameEn: string;
      address: string;
      star: number;
      openedAt: string;
      roomTypes: { name: string; price: number; stock?: number }[];
      status: string;
      rejectReason?: string;
    }>(`/api/merchant/hotels/${id}`, { token }),
  updateHotel: (
    id: string,
    body: Partial<{
      nameZh: string;
      nameEn: string;
      address: string;
      star: number;
      openedAt: string;
      roomTypes: { name: string; price: number; stock?: number }[];
    }>,
    token: string
  ) =>
    request<{ id: string; status: string }>(`/api/merchant/hotels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      token,
    }),
  submitHotel: (id: string, token: string) =>
    request<{ id: string; status: string }>(`/api/merchant/hotels/${id}/submit`, {
      method: 'POST',
      token,
    }),
};

// ========== 管理员 ==========
export const adminApi = {
  listHotels: (params: { status?: string; page?: number; pageSize?: number }, token: string) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, String(v));
    });
    return request<{
      list: { id: string; nameZh: string; nameEn: string; address: string; star: number; status: string; rejectReason?: string }[];
      page: number;
      pageSize: number;
      total: number;
    }>(`/api/admin/hotels?${q}`, { token });
  },
  getHotel: (id: string, token: string) =>
    request<{
      id: string;
      nameZh: string;
      nameEn: string;
      address: string;
      star: number;
      openedAt: string;
      roomTypes: { name: string; price: number; stock?: number }[];
      status: string;
      rejectReason?: string;
    }>(`/api/admin/hotels/${id}`, { token }),
  approve: (id: string, token: string) =>
    request<{ id: string; status: string }>(`/api/admin/hotels/${id}/approve`, {
      method: 'POST',
      token,
    }),
  reject: (id: string, reason: string, token: string) =>
    request<{ id: string; status: string }>(`/api/admin/hotels/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      token,
    }),
  publish: (id: string, token: string) =>
    request<{ id: string; status: string }>(`/api/admin/hotels/${id}/publish`, {
      method: 'POST',
      token,
    }),
  offline: (id: string, token: string) =>
    request<{ id: string; status: string }>(`/api/admin/hotels/${id}/offline`, {
      method: 'POST',
      token,
    }),
  restore: (id: string, token: string) =>
    request<{ id: string; status: string }>(`/api/admin/hotels/${id}/restore`, {
      method: 'POST',
      token,
    }),
};
