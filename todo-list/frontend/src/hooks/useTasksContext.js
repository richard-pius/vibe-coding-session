import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export function useTasksContext() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: null,
    priority: null,
    category: null,
  });

  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTasks = useCallback(async () => {
    if (!user.User_ID) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        user_id: user.User_ID,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.category && { category: filters.category }),
      });

      const response = await axios.get(`/api/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTasks(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [user.User_ID, token, filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(
    async (taskData) => {
      try {
        const response = await axios.post(
          '/api/tasks',
          { ...taskData, User_ID: user.User_ID },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTasks([...tasks, response.data.data]);
        return { success: true, data: response.data.data };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to create task';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [tasks, user.User_ID, token]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      try {
        const response = await axios.put(`/api/tasks/${taskId}`, updates, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTasks(
          tasks.map(t => (t.Task_ID === taskId ? response.data.data : t))
        );
        return { success: true, data: response.data.data };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to update task';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [tasks, token]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      try {
        await axios.delete(`/api/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTasks(tasks.filter(t => t.Task_ID !== taskId));
        return { success: true };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete task';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [tasks, token]
  );

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    tasks,
    loading,
    error,
    filters,
    createTask,
    updateTask,
    deleteTask,
    setFilters: applyFilters,
    refetch: fetchTasks,
  };
}
