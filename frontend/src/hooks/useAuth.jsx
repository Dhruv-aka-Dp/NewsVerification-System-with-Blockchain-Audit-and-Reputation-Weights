import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-login: try saved token first, then auto-login as dp for demo
  useEffect(() => {
    const token = localStorage.getItem('nv_token');
    if (token) {
      getMe()
        .then(u => { setUser(u); setLoading(false); })
        .catch(() => {
          localStorage.removeItem('nv_token');
          autoLogin();
        });
    } else {
      autoLogin();
    }
  }, []);

  async function autoLogin() {
    try {
      const data = await apiLogin('dp@jklu.edu.in', 'demo123');
      localStorage.setItem('nv_token', data.token);
      setUser(data.user);
    } catch {
      // Fallback: try admin
      try {
        const data = await apiLogin('admin@newsverify.local', 'admin123');
        localStorage.setItem('nv_token', data.token);
        setUser(data.user);
      } catch {
        // No users available yet
      }
    }
    setLoading(false);
  }

  const switchUser = useCallback(async (email, password) => {
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem('nv_token', data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nv_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user, logout, loading, switchUser, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
