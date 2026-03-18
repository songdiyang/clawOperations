import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { userApi, setStoredToken, setStoredUser, clearStoredToken, getStoredToken, getStoredUser } from '../api/client';

/** 用户信息类型 */
export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 认证上下文类型 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (account: string, password: string, remember?: boolean) => Promise<void>;
  register: (username: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** 认证上下文提供器 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查登录状态
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      
      if (token && storedUser) {
        setUser(storedUser);
        // 后台验证 token 有效性
        try {
          const response = await userApi.getProfile();
          if (response.data.success) {
            setUser(response.data.data);
            setStoredUser(response.data.data);
          }
        } catch {
          // Token 无效，清除存储
          clearStoredToken();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // 监听 401 未授权事件
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  /** 登录 */
  const login = useCallback(async (account: string, password: string, remember?: boolean) => {
    const response = await userApi.login({ account, password, remember });
    if (response.data.success) {
      const { user: userData, token } = response.data.data;
      setStoredToken(token);
      setStoredUser(userData);
      setUser(userData);
    } else {
      throw new Error(response.data.error || '登录失败');
    }
  }, []);

  /** 注册 */
  const register = useCallback(async (username: string, email: string, password: string, phone?: string) => {
    const response = await userApi.register({ username, email, password, phone });
    if (response.data.success) {
      const { user: userData, token } = response.data.data;
      setStoredToken(token);
      setStoredUser(userData);
      setUser(userData);
    } else {
      throw new Error(response.data.error || '注册失败');
    }
  }, []);

  /** 登出 */
  const logout = useCallback(async () => {
    try {
      await userApi.logout();
    } catch {
      // 忽略错误
    } finally {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  /** 更新用户信息 */
  const updateUser = useCallback((userData: User) => {
    setUser(userData);
    setStoredUser(userData);
  }, []);

  /** 检查认证状态 */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return false;
    }

    try {
      const response = await userApi.getProfile();
      if (response.data.success) {
        setUser(response.data.data);
        setStoredUser(response.data.data);
        return true;
      }
    } catch {
      clearStoredToken();
      setUser(null);
    }
    return false;
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/** 使用认证上下文的 Hook */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
