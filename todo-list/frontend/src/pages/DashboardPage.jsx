import React, { useState, useEffect } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import '../styles/dashboard.css';

export function DashboardPage() {
  const { user } = useAuth();
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data, loading, error } = useDashboardData(user?.User_ID, month, year);

  if (loading) {
    return <div className="dashboard-container"><p>Loading dashboard...</p></div>;
  }

  if (error) {
    return <div className="dashboard-container error">{error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="date-selector">
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(year, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {[...Array(5)].map((_, i) => {
              const y = currentDate.getFullYear() - 2 + i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {data && (
        <>
          <div className="summary-cards">
            <div className="card income">
              <h3>Total Income</h3>
              <p className="amount">${data.totalIncome?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="card expense">
              <h3>Total Expenses</h3>
              <p className="amount">${data.totalExpenses?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="card savings">
              <h3>Net Savings</h3>
              <p className="amount">${data.netSavings?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="card completion">
              <h3>Task Completion</h3>
              <p className="percentage">
                {((data.taskCompletionRate || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-container">
              <h3>Income vs Expenses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Financial', income: data.totalIncome, expenses: data.totalExpenses }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" />
                  <Bar dataKey="expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>Savings Rate</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Savings', value: data.netSavings || 0 },
                      { name: 'Expenses', value: data.totalExpenses || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="task-summary">
            <h3>Task Status</h3>
            <p>Completed: {data.taskCompletionRate ? Math.round(data.taskCompletionRate * 100) : 0}%</p>
            <p>Upcoming: {data.upcomingTasks || 0} tasks</p>
          </div>
        </>
      )}
    </div>
  );
}
