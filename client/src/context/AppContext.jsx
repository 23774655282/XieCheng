import axios from 'axios';
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

const AppContext = createContext();

export function AppProvider({ children }) {
  const currency = import.meta.env.VITE_CURRENCY || '元';
  const navigate = useNavigate();

  // 本地登录用户（UI 展示用），实际身份由后端 /api/users 返回的 role 控制
  const [user] = useState({ username: 'Local User', email: 'local@example.com' });
  const getToken = async () => localStorage.getItem("token");

  const [role, setRoleState] = useState(null); // 'user' | 'merchant' | 'admin'
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
  const [isOwner, setIsOwner] = useState(false);   // 商户：可访问 /owner
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false); // 平台管理员：可访问 /admin

  const [showHotelReg, setShowHotelReg] = useState(false);
  const [searchCity, setSearchCity] = useState([]);
  const [recentSearchRecords, setRecentSearchRecords] = useState(() => {
    try {
      const raw = localStorage.getItem("recentSearchRecords");
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.slice(0, 5) : [];
      }
    } catch (_) {}
    return [];
  });
  const [rooms, setRooms] = useState([]);

  function addRecentSearch(record) {
    const r = {
      destination: record.destination?.trim() || "",
      checkIn: record.checkIn || "",
      checkOut: record.checkOut || "",
      rooms: record.rooms ?? 1,
      adults: record.adults ?? 2,
    };
    if (!r.destination) return;
    setRecentSearchRecords((prev) => {
      const filtered = prev.filter((x) => x.destination !== r.destination);
      const next = [r, ...filtered].slice(0, 5);
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
    }
  }

  async function fetchUser() {
    try {
      const token = await getToken();
      if (!token) {
        setIsAuthenticated(false);
        setRoleState(null);
        setIsOwner(false);
        setIsPlatformAdmin(false);
        return;
      }

      const { data } = await axios.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const r = data.role || "user";
        setRoleState(r);
        setIsOwner(r === "merchant" || r === "admin");
        setIsPlatformAdmin(r === "admin");
        const apiCities = data.recentSerachCities || [];
        setSearchCity(apiCities);
        setRecentSearchRecords((prev) => {
          const known = new Set(prev.map((x) => x.destination));
          const fromApi = apiCities.filter((c) => !known.has(c)).map((c) => ({ destination: c }));
          const merged = [...prev, ...fromApi].slice(0, 5);
          try { localStorage.setItem('recentSearchRecords', JSON.stringify(merged)); } catch (_) {}
          return merged;
        });
        setIsAuthenticated(true);
        toast.success("用户信息加载成功");
      }
    } catch (error) {
      toast.error("获取用户信息失败，请稍后重试。");
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchRooms(1);
  }, []);

  async function setRole(roleChoice) {
    try {
      const token = await getToken();
      if (!token) return false;

      const { data } = await axios.post(
        "/api/users/set-role",
        { role: roleChoice },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (data.success) {
        setRoleState(data.role);
        setIsOwner(data.role === "merchant" || data.role === "admin");
        setIsPlatformAdmin(data.role === "admin");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setRoleState(null);
    setIsOwner(false);
    setIsPlatformAdmin(false);
    setSearchCity([]);
    setRecentSearchRecords([]);
    try { localStorage.removeItem("recentSearchRecords"); } catch (_) {}
  }

  const value = {
    currency,
    navigate,
    user,
    getToken,
    role,
    isAuthenticated,
    isOwner,
    setIsOwner,
    isPlatformAdmin,
    setRole,
    logout,
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
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
