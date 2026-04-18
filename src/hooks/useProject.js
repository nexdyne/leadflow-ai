import { useState, useCallback } from 'react';
import { apiCall } from '../api/apiConfig.js';

export function useProject() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const loadProjects = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/projects?limit=50&search=${encodeURIComponent(search)}`);
      setProjects(data.projects);
      return data.projects;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (projectName, stateData, isDraft = true) => {
    setLoading(true);
    setError(null);
    try {
      if (currentProjectId) {
        // Update existing
        const data = await apiCall('PUT', `/projects/${currentProjectId}`, {
          projectName, stateData, isDraft,
        });
        return currentProjectId;
      } else {
        // Create new
        const data = await apiCall('POST', '/projects', {
          projectName, stateData, isDraft,
        });
        setCurrentProjectId(data.id);
        return data.id;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  const loadProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall('GET', `/projects/${projectId}`);
      setCurrentProjectId(projectId);
      return data.stateData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    setLoading(true);
    setError(null);
    try {
      await apiCall('DELETE', `/projects/${projectId}`);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (currentProjectId === projectId) setCurrentProjectId(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProjectId]);

  return {
    projects, loading, error, currentProjectId,
    loadProjects, saveProject, loadProject, deleteProject,
    setCurrentProjectId,
  };
}
