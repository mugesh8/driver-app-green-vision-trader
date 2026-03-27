import { createContext, useContext, useState, useEffect } from 'react';
import {
  loginDriver,
  getStoredToken,
  getStoredUser,
  storeAuth,
  clearAuth,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await loginDriver(email, password);
    const payload = data?.data && typeof data.data === 'object' ? data.data : data;

    const authToken =
      data?.token ||
      data?.accessToken ||
      data?.access_token ||
      payload?.token ||
      payload?.accessToken ||
      payload?.access_token ||
      payload?.jwt ||
      payload?.authToken;

    const userData =
      payload?.user ||
      payload?.driver ||
      payload?.profile ||
      payload?.data ||
      data?.user ||
      data?.driver ||
      payload ||
      data;

    if (!authToken) {
      throw new Error(data.message || 'Invalid response from server');
    }

    console.log('Login response:', data);
    console.log('User data:', userData);

    storeAuth(authToken, userData);
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
