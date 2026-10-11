import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username?: string; email?: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string; role?: string }) => Promise<void>;
  logout: () => void;
  loginAsDemoAnalyst: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cti_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cti_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('cti_auth_token');
      if (storedToken) {
        try {
          const res = await authService.getCurrentUser();
          setUser(res.data.user);
        } catch {
          localStorage.removeItem('cti_auth_token');
          localStorage.removeItem('cti_user');
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };
    verifyAuth();
  }, []);

  const login = async (credentials: { username?: string; email?: string; password: string }) => {
    const res = await authService.login(credentials);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('cti_auth_token', newToken);
    localStorage.setItem('cti_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (data: { username: string; email: string; password: string; role?: string }) => {
    const res = await authService.register(data);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('cti_auth_token', newToken);
    localStorage.setItem('cti_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    try {
      authService.logout();
    } catch {}
    localStorage.removeItem('cti_auth_token');
    localStorage.removeItem('cti_user');
    setUser(null);
    setToken(null);
  };

  const loginAsDemoAnalyst = async () => {
    await login({
      username: 'analyst_demo',
      password: 'TemporalForensics2026!',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        loginAsDemoAnalyst,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
