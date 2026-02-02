/**
 * 认证上下文：存储 token、角色、登录/登出
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'yisu_token';
const ROLE_KEY = 'yisu_role';
const USERNAME_KEY = 'yisu_username';

interface AuthState {
  token: string | null;
  role: 'merchant' | 'admin' | null;
  username: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, role: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem(STORAGE_KEY),
    role: (localStorage.getItem(ROLE_KEY) as 'merchant' | 'admin') || null,
    username: localStorage.getItem(USERNAME_KEY),
  }));

  const login = useCallback((token: string, role: string, username: string) => {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(USERNAME_KEY, username);
    setState({ token, role: role as 'merchant' | 'admin', username });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setState({ token: null, role: null, username: null });
  }, []);

  // 同步多标签页
  useEffect(() => {
    const handler = () => {
      const token = localStorage.getItem(STORAGE_KEY);
      const role = localStorage.getItem(ROLE_KEY) as 'merchant' | 'admin' | null;
      const username = localStorage.getItem(USERNAME_KEY);
      setState({ token, role, username });
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAuthenticated: !!state.token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
