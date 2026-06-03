import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function storedUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const save = data => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    if (token) api.get('/auth/me').then(res => setUser(res.data.user)).catch(logout);
  }, []);

  return <AuthContext.Provider value={{ user, token, save, logout }}>{children}</AuthContext.Provider>;
}
