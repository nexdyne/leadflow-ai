import { useState, useCallback } from 'react';
import { apiCall } from '../api/apiConfig.js';

export function useTeam() {
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  // ─── Team CRUD ──────────────────────────────────────────
  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', '/teams');
      setTeams(data.teams);
      return data.teams;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeam = useCallback(async (name, description) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('POST', '/teams', { name, description });
      // Backend returns team object directly (not wrapped in .team)
      const team = data.team || data;
      setTeams(prev => [...prev, team]);
      return team;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeam = useCallback(async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/teams/${teamId}`);
      // Backend returns team object directly (not wrapped in .team)
      const team = data.team || data;
      setCurrentTeam(team);
      return team;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeam = useCallback(async (teamId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('PUT', `/teams/${teamId}`, updates);
      setCurrentTeam(prev => prev ? { ...prev, ...updates } : prev);
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...updates } : t));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Switch active team ─────────────────────────────────
  const switchTeam = useCallback(async (teamId) => {
    setError(null);
    try {
      await apiCall('POST', '/teams/switch', { teamId });
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ─── Members ────────────────────────────────────────────
  const loadMembers = useCallback(async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/teams/${teamId}/members`);
      setMembers(data.members);
      return data.members;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMemberRole = useCallback(async (teamId, memberId, role) => {
    setError(null);
    try {
      await apiCall('PUT', `/teams/${teamId}/members/${memberId}`, { role });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeMember = useCallback(async (teamId, memberId) => {
    setError(null);
    try {
      await apiCall('DELETE', `/teams/${teamId}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const leaveTeam = useCallback(async (teamId) => {
    setError(null);
    try {
      await apiCall('POST', `/teams/${teamId}/leave`);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ─── Invites ────────────────────────────────────────────
  const loadInvites = useCallback(async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/teams/${teamId}/invites`);
      setInvites(data.invites);
      return data.invites;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvite = useCallback(async (teamId, email, role = 'inspector') => {
    setError(null);
    try {
      const data = await apiCall('POST', `/teams/${teamId}/invites`, { email, role });
      // Backend returns invite object directly (not wrapped in .invite)
      const invite = data.invite || data;
      setInvites(prev => [...prev, invite]);
      return invite;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const revokeInvite = useCallback(async (teamId, inviteId) => {
    setError(null);
    try {
      await apiCall('DELETE', `/teams/${teamId}/invites/${inviteId}`);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ─── Public invite operations (no auth needed for details) ───
  const getInviteDetails = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/teams/invite/${token}`);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvite = useCallback(async (token) => {
    setError(null);
    try {
      const data = await apiCall('POST', `/teams/invite/${token}/accept`);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    teams, currentTeam, members, invites, loading, error,
    clearError,
    loadTeams, createTeam, loadTeam, updateTeam, switchTeam,
    loadMembers, updateMemberRole, removeMember, leaveTeam,
    loadInvites, createInvite, revokeInvite,
    getInviteDetails, acceptInvite,
  };
}
