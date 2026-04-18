import { useState, useCallback } from 'react';
import { apiCall } from '../api/apiConfig.js';

export function useClient() {
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  // ─── Projects ──────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', '/client/projects');
      setProjects(data.projects);
      return data.projects;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getProject = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/client/projects/${id}`);
      return data.project;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Requests ──────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', '/client/requests');
      setRequests(data.requests);
      return data.requests;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createRequest = useCallback(async (requestData) => {
    setError(null);
    try {
      const data = await apiCall('POST', '/client/requests', requestData);
      setRequests(prev => [data.request, ...prev]);
      return data.request;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // ─── Messages ──────────────────────────────────────────
  const loadMessages = useCallback(async (projectId) => {
    setError(null);
    try {
      const data = await apiCall('GET', `/client/messages/${projectId}`);
      setMessages(data.messages);
      return data.messages;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (projectId, content) => {
    setError(null);
    try {
      const data = await apiCall('POST', `/client/messages/${projectId}`, { content });
      setMessages(prev => [...prev, data.message]);
      return data.message;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await apiCall('GET', '/client/unread');
      setUnreadCount(data.unreadCount);
    } catch { /* ignore */ }
  }, []);

  return {
    projects, requests, messages, unreadCount, loading, error,
    clearError,
    loadProjects, getProject,
    loadRequests, createRequest,
    loadMessages, sendMessage, loadUnreadCount,
  };
}
