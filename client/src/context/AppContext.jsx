import axios from 'axios';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { tokenCookie } from '../utils/cookie';

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

/** 请求拦截：统一从 cookie 注入 token，避免每个请求都手动带认证 */
axios.interceptors.request.use((config) => {
  const token = tokenCookie.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AppContext = createContext();

export function AppProvider({ children }) {
  const currency = import.meta.env.VITE_CURRENCY || '元';
  const navigate = useNavigate();
  const fetchUserPromiseRef = useRef(null);

  const [userInfo, setUserInfo] = useState({ _id: null, username: '', avatar: '', birthday: null, favoriteHotels: [] });
  const getToken = async () => tokenCookie.get();

  /** 仅解码 JWT payload 判断是否过期，不校验签名 */
  function isTokenExpired(token) {
    if (!token || typeof token !== "string") return true;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      return payload.exp != null && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  const [role, setRoleState] = useState(null); // 'user' | 'merchant' | 'admin'
  const [merchantApplicationStatus, setMerchantApplicationStatus] = useState(null); // 'none' | 'pending' | 'approved' | 'rejected'
  const [isAuthenticated, setIsAuthenticated] = useState(!!tokenCookie.get());
  const [isOwner, setIsOwner] = useState(false);   // 商户：可访问 /owner
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false); // 平台管理员：可访问 /admin
  const [authChecked, setAuthChecked] = useState(false); // 认证是否已加载（刷新后需等待）

  const [showHotelReg, setShowHotelReg] = useState(false);
  const [searchCity, setSearchCity] = useState([]);
  const [recentSearchRecords, setRecentSearchRecords] = useState(() => {
    try {
      const raw = localStorage.getItem("recentSearchRecords");
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.slice(0, 2) : [];
      }
    } catch (_) {}
    return [];
  });
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  function addRecentSearch(record) {
    const r = {
      destination: record.destination?.trim() || "",
      checkIn: record.checkIn || "",
      checkOut: record.checkOut || "",
      rooms: record.rooms ?? 1,
      adults: record.adults ?? 2,
      children: record.children ?? 0,
      lat: record.lat != null && Number.isFinite(record.lat) ? record.lat : undefined,
      lng: record.lng != null && Number.isFinite(record.lng) ? record.lng : undefined,
    };
    if (!r.destination) return;
    setRecentSearchRecords((prev) => {
      const filtered = prev.filter((x) => x.destination !== r.destination);
      const next = [r, ...filtered].slice(0, 2);
      try { localStorage.setItem("recentSearchRecords", JSON.stringify(next)); } catch (_) {}
      return next;
    });
    setSearchCity((prev) => {
      const updated = prev.includes(r.destination) ? prev : [r.destination, ...prev].slice(0, 5);
      return updated;
    });
  }

  function clearRecentSearch() {
    setRecentSearchRecords([]);
    setSearchCity([]);
    try { localStorage.removeItem("recentSearchRecords"); } catch (_) {}
  }

  async function fetchRooms(page = 1) {
    if (page === 1) setRoomsLoading(true);
    try {
      const { data } = await axios.get(`/api/rooms/?page=${page}&limit=12`);
      if (data.success) {
        if (page === 1) setRooms(data.rooms || []);
        else setRooms((prev) => [...prev, ...(data.rooms || [])]);
        return { rooms: data.rooms, hasMore: data.hasMore, total: data.total };
      }
      return { rooms: [], hasMore: false };
    } catch (error) {
      console.error("Error fetching rooms:", error);
      return { rooms: [], hasMore: false };
    } finally {
      if (page === 1) setRoomsLoading(false);
    }
  }

  /** 拉取当前用户信息并更新认证状态。返回 true 表示已登录，false 表示未登录/失败。 */
  async function fetchUser() {
    if (fetchUserPromiseRef.current) return fetchUserPromiseRef.current;
    const run = async () => {
      try {
        const token = tokenCookie.get();
        if (!token) {
          setIsAuthenticated(false);
          setRoleState(null);
          setMerchantApplicationStatus(null);
          setIsOwner(false);
          setIsPlatformAdmin(false);
          setUserInfo({ _id: null, username: '', avatar: '', birthday: null, favoriteHotels: [] });
          setAuthChecked(true);
          fetchUserPromiseRef.current = null;
          return false;
        }
        if (isTokenExpired(token)) {
          tokenCookie.remove();
          setIsAuthenticated(false);
          setRoleState(null);
          setMerchantApplicationStatus(null);
          setIsOwner(false);
          setIsPlatformAdmin(false);
          setUserInfo({ _id: null, username: '', avatar: '', birthday: null, favoriteHotels: [] });
          setAuthChecked(true);
          fetchUserPromiseRef.current = null;
          return false;
        }

        const res = await axios.get("/api/users").catch((err) => {
          if (err.response?.status === 401) return { data: { success: false } };
          throw err;
        });
        const data = res?.data;
        if (data?.success) {
          const r = data.role || "user";
          setRoleState(r);
          setMerchantApplicationStatus(data.merchantApplicationStatus || "none");
          setIsOwner(r === "merchant");  // 仅商户可访问商户中心，管理员与商户互斥
          setIsPlatformAdmin(r === "admin");
          setUserInfo({
            _id: data._id || null,
            username: data.username || '',
            avatar: data.avatar || '',
            birthday: data.birthday || null,
            favoriteHotels: data.favoriteHotels || [],
          });
          const apiCities = data.recentSerachCities || [];
          setSearchCity(apiCities);
          setRecentSearchRecords((prev) => {
            const known = new Set(prev.map((x) => x.destination));
            const fromApi = apiCities.filter((c) => !known.has(c)).map((c) => ({ destination: c }));
            const merged = [...prev, ...fromApi].slice(0, 2);
            try { localStorage.setItem('recentSearchRecords', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
          setIsAuthenticated(true);
          setAuthChecked(true);
          fetchUserPromiseRef.current = null;
          return true;
        } else {
          tokenCookie.remove();
          setIsAuthenticated(false);
          setRoleState(null);
          setMerchantApplicationStatus(null);
          setIsOwner(false);
          setIsPlatformAdmin(false);
          setUserInfo({ _id: null, username: '', avatar: '', birthday: null, favoriteHotels: [] });
          setAuthChecked(true);
          fetchUserPromiseRef.current = null;
          return false;
        }
      } catch (error) {
        if (error.response?.status === 401) tokenCookie.remove();
        setIsAuthenticated(false);
        setRoleState(null);
        setMerchantApplicationStatus(null);
        setIsOwner(false);
        setIsPlatformAdmin(false);
        setUserInfo({ _id: null, username: '', avatar: '', birthday: null, favoriteHotels: [] });
        setAuthChecked(true);
        fetchUserPromiseRef.current = null;
        if (error.response?.status !== 401) {
          toast.error("获取用户信息失败，请稍后重试。");
        }
        return false;
      }
    };
    fetchUserPromiseRef.current = run();
    return fetchUserPromiseRef.current;
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchRooms(1);
  }, []);

  async function applyMerchant() {
    try {
      const token = await getToken();
      if (!token) return false;
      const { data } = await axios.post("/api/merchant/apply", {}, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        setMerchantApplicationStatus("pending");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** 用登录接口返回的 token + user 直接更新认证状态，不依赖 GET /api/users，避免登录后仍显示未登录 */
  function setAuthFromLogin({ token, user }) {
    if (!token) return;
    tokenCookie.set(token);
    const r = (user && user.role) || "user";
    setRoleState(r);
    setMerchantApplicationStatus("none");
    setIsOwner(r === "merchant");  // 仅商户可访问商户中心，管理员与商户互斥
    setIsPlatformAdmin(r === "admin");
    setUserInfo({
      _id: user?.id || null,
      username: (user && user.username) || "",
      avatar: (user && user.avatar) || "",
      birthday: (user && user.birthday) || null,
      favoriteHotels: (user && user.favoriteHotels) || [],
    });
    setIsAuthenticated(true);
    setAuthChecked(true);
  }

  function logout() {
    tokenCookie.remove();
    setIsAuthenticated(false);
    setRoleState(null);
    setMerchantApplicationStatus(null);
    setIsOwner(false);
    setIsPlatformAdmin(false);
    setUserInfo({ _id: null, username: '', avatar: '', birthday: null, favoriteHotels: [] });
    setSearchCity([]);
    setRecentSearchRecords([]);
    try { localStorage.removeItem("recentSearchRecords"); } catch (_) {}
    navigate("/", { replace: true });
  }

  const value = {
    currency,
    navigate,
    user: userInfo,
    userInfo,
    setUserInfo,
    getToken,
    role,
    merchantApplicationStatus,
    isAuthenticated,
    isOwner,
    setIsOwner,
    isPlatformAdmin,
    authChecked,
    applyMerchant,
    logout,
    setAuthFromLogin,
    fetchUser,
    fetchRooms,
    axios,
    showHotelReg,
    setShowHotelReg,
    searchCity,
    setSearchCity,
    recentSearchRecords,
    addRecentSearch,
    clearRecentSearch,
    rooms,
    setRooms,
    roomsLoading,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
