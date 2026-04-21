import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { apiCall, setTokens, clearTokens, getToken, setOnAuthFailure } from '../api/apiConfig.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    apiCall('POST', '/auth/logout', {
      refreshToken: localStorage.getItem('leadflow_refresh'),
    }).catch(() => {}); // best-effort
    clearTokens();
    setUser(null);
    setCurrentTeam(null);
    setTeamCount(0);
  }, []);

  // Refresh profile (and team context) from server
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await apiCall('GET', '/auth/profile');
      setUser(profile);
      setCurrentTeam(profile.currentTeam || null);
      setTeamCount(profile.teamCount || 0);
      return profile;
    } catch {
      return null;
    }
  }, []);

  // On mount, check if we have a valid token
  useEffect(() => {
    setOnAuthFailure(() => {
      setUser(null);
      setCurrentTeam(null);
    });

    const token = getToken();
    if (token) {
      refreshProfile()
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshProfile]);

  // `surface` identifies which login surface the credentials were entered on:
  //   "admin"     — PlatformAdminLoginPage (mounted at /admin)
  //   "inspector" — LoginPage (mounted at /login)
  //   "client"    — LoginPage in isClientPortal mode (mounted at /portal)
  // The server uses this to enforce surface/role separation so an inspector
  // can't inadvertently sign into the admin console and a platform admin
  // can't silently get an inspector session when signing in at /login.
  const login = useCallback(async (email, password, surface) => {
    const body = { email, password };
    if (surface) body.surface = surface;
    const data = await apiCall('POST', '/auth/login', body);
    setTokens(data.token, data.refreshToken);
    setUser(data.user);
    // Fetch full profile to get team context
    refreshProfile();
    return data.user;
  }, [refreshProfile]);

  const register = useCallback(async (email, password, fullName, companyName, role, designation) => {
    const body = { email, password, fullName, companyName };
    if (role) body.role = role;
    if (designation) body.designation = designation;
    const data = await apiCall('POST', '/auth/register', body);
    setTokens(data.token, data.refreshToken);
    setUser(data.user);
    refreshProfile();
    return data.user;
  }, [refreshProfile]);

  // Seed an already-issued session into the auth context, skipping
  // the /auth/login roundtrip. Used by flows that receive a token
  // from a non-login endpoint (e.g. client share-invite accept —
  // POST /client-invite/:token/accept returns the fresh session
  // straight from the invite-acceptance transaction, so there's no
  // reason to turn around and call /auth/login again).
  const applySession = useCallback(({ user: nextUser, token, refreshToken }) => {
    if (!nextUser || !token) return;
    setTokens(token, refreshToken);
    setUser(nextUser);
    refreshProfile();
  }, [refreshProfile]);

  const updateDesignation = useCallback(async (designation) => {
    await apiCall('PUT', '/auth/designation', { designation });
    await refreshProfile();
  }, [refreshProfile]);

  // Verify license with LARA and set designation + license number
  const verifyAndSetDesignation = useCallback(async (designation, licenseNumber) => {
    const result = await apiCall('PUT', '/license/set-own', { designation, licenseNumber });
    await refreshProfile();
    return result; // { success, designation, licenseNumber, verification }
  }, [refreshProfile]);

  // Verify a license number without saving (preview check)
  const checkLicense = useCallback(async (licenseNumber, designation) => {
    return await apiCall('POST', '/license/verify', { licenseNumber, designation });
  }, []);

  // Set a team member's designation + license (admin only)
  const setMemberLicense = useCallback(async (teamId, memberId, designation, licenseNumber) => {
    return await apiCall('PUT', '/license/set-member', { teamId, memberId, designation, licenseNumber });
  }, []);

  // Change own password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const result = await apiCall('PUT', '/auth/change-password', { currentPassword, newPassword });
    await refreshProfile(); // refresh to clear mustChangePassword flag
    return result;
  }, [refreshProfile]);

  const isPlatformAdmin = user?.role === 'platform_admin' || user?.isPlatformAdmin || false;

  const value = {
    user, loading, login, register, logout, isAuthenticated: !!user,
    isPlatformAdmin,
    applySession,
    currentTeam, teamCount, refreshProfile, updateDesignation,
    verifyAndSetDesignation, checkLicense, setMemberLicense, changePassword,
  };

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
