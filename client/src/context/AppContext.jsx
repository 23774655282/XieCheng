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
  const [rooms, setRooms] = useState([]);

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
        setSearchCity(data.recentSerachCities || []);
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
