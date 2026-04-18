import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { apiCall, setTokens, clearTokens, getToken, setOnAuthFailure } from '../api/apiConfig.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    apiCall('POST', '/auth/logout', {
      refreshToken: localStorage.getItem('leadflow_refresh'),
    }).catch(() => {}); // best-effort
    clearTokens();
    setUser(null);
  }, []);

  // On mount, check if we have a valid token
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
    });

    const token = getToken();
    if (token) {
      apiCall('GET', '/auth/profile')
        .then(profile => setUser(profile))
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiCall('POST', '/auth/login', { email, password });
    setTokens(data.token, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, fullName, companyName) => {
    const data = await apiCall('POST', '/auth/register', { email, password, fullName, companyName });
    setTokens(data.token, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const value = { user, loading, login, register, logout, isAuthenticated: !!user };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
