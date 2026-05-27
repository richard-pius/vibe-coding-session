import React, { useState } from 'react';
import { useTransactionsContext } from '../hooks/useTransactionsContext';
import '../styles/transactions.css';

export function TransactionsPage() {
  const { transactions, loading, error, createTransaction, deleteTransaction } = useTransactionsContext();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Amount: '',
    Type: 'Expense',
    Category: 'Groceries',
    Description: '',
    Payment_Method: 'Credit Card',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTransaction(formData);
    setFormData({
      Date: new Date().toISOString().split('T')[0],
      Amount: '',
      Type: 'Expense',
      Category: 'Groceries',
      Description: '',
      Payment_Method: 'Credit Card',
    });
    setShowForm(false);
  };

  const handleDelete = async (transactionId) => {
    if (window.confirm('Delete this transaction?')) {
      await deleteTransaction(transactionId);
    }
  };

  return (
    <div className="transactions-container">
      <div className="transactions-header">
        <h1>Transactions</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Transaction'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.Date}
                onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.Amount}
                onChange={(e) => setFormData({ ...formData, Amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                value={formData.Type}
                onChange={(e) => setFormData({ ...formData, Type: e.target.value })}
              >
                <option>Income</option>
                <option>Expense</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.Category}
                onChange={(e) => setFormData({ ...formData, Category: e.target.value })}
              >
                <option>Groceries</option>
                <option>Utilities</option>
                <option>Transportation</option>
                <option>Entertainment</option>
                <option>Healthcare</option>
                <option>Salary</option>
                <option>Freelance</option>
                <option>Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select
                value={formData.Payment_Method}
                onChange={(e) => setFormData({ ...formData, Payment_Method: e.target.value })}
              >
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Cash</option>
                <option>Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              placeholder="Transaction details"
            />
          </div>

          <button type="submit" className="btn-primary">
            Add Transaction
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading transactions...</p>
      ) : (
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No transactions yet</td>
                </tr>
              ) : (
                transactions.map(trans => (
                  <tr key={trans.Transaction_ID} className={`type-${trans.Type?.toLowerCase()}`}>
                    <td>{new Date(trans.Date).toLocaleDateString()}</td>
                    <td>{trans.Description || '—'}</td>
                    <td>{trans.Category}</td>
                    <td>{trans.Type}</td>
                    <td className="amount">
                      {trans.Type === 'Income' ? '+' : '-'}${parseFloat(trans.Amount).toFixed(2)}
                    </td>
                    <td>{trans.Payment_Method}</td>
                    <td>
                      <button
                        onClick={() => handleDelete(trans.Transaction_ID)}
                        className="btn-danger btn-small"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
