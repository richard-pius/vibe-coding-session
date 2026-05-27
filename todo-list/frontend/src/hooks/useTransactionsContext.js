import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

export function useTransactionsContext() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    category: null,
    type: null,
  });

  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTransactions = useCallback(async () => {
    if (!user.User_ID) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        user_id: user.User_ID,
        ...(filters.startDate && { start_date: filters.startDate }),
        ...(filters.endDate && { end_date: filters.endDate }),
        ...(filters.category && { category: filters.category }),
        ...(filters.type && { type: filters.type }),
      });

      const response = await axios.get(`/api/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [user.User_ID, token, filters]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = useCallback(
    async (transactionData) => {
      try {
        const response = await axios.post(
          '/api/transactions',
          { ...transactionData, User_ID: user.User_ID },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setTransactions([...transactions, response.data.data]);
        return { success: true, data: response.data.data };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to create transaction';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [transactions, user.User_ID, token]
  );

  const updateTransaction = useCallback(
    async (transactionId, updates) => {
      try {
        const response = await axios.put(`/api/transactions/${transactionId}`, updates, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTransactions(
          transactions.map(t => (t.Transaction_ID === transactionId ? response.data.data : t))
        );
        return { success: true, data: response.data.data };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to update transaction';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [transactions, token]
  );

  const deleteTransaction = useCallback(
    async (transactionId) => {
      try {
        await axios.delete(`/api/transactions/${transactionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setTransactions(transactions.filter(t => t.Transaction_ID !== transactionId));
        return { success: true };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to delete transaction';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    },
    [transactions, token]
  );

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  return {
    transactions,
    loading,
    error,
    filters,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    setFilters: applyFilters,
    refetch: fetchTransactions,
  };
}
