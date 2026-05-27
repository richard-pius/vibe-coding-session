import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export function useDashboardData(userId, month, year) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('authToken');

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/dashboard/summary?user_id=${userId}&month=${month}&year=${year}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, month, year, token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
}
