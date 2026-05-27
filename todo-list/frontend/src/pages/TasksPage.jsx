import React, { useState } from 'react';
import { useTasksContext } from '../hooks/useTasksContext';
import '../styles/tasks.css';

export function TasksPage() {
  const { tasks, loading, error, createTask, updateTask, deleteTask } = useTasksContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    Task_Name: '',
    Description: '',
    Due_Date: '',
    Status: 'Pending',
    Priority: 'Medium',
    Category: 'General',
  });

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();

    if (editingId) {
      await updateTask(editingId, formData);
      setEditingId(null);
    } else {
      await createTask(formData);
    }

    setFormData({
      Task_Name: '',
      Description: '',
      Due_Date: '',
      Status: 'Pending',
      Priority: 'Medium',
      Category: 'General',
    });
    setShowForm(false);
  };

  const handleEdit = (task) => {
    setFormData({
      Task_Name: task.Task_Name,
      Description: task.Description,
      Due_Date: task.Due_Date,
      Status: task.Status,
      Priority: task.Priority,
      Category: task.Category,
    });
    setEditingId(task.Task_ID);
    setShowForm(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(taskId);
    }
  };

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1>Tasks</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreateOrUpdate} className="task-form">
          <div className="form-group">
            <label>Task Name *</label>
            <input
              type="text"
              value={formData.Task_Name}
              onChange={(e) => setFormData({ ...formData, Task_Name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={formData.Due_Date}
                onChange={(e) => setFormData({ ...formData, Due_Date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.Priority}
                onChange={(e) => setFormData({ ...formData, Priority: e.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.Status}
                onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary">
            {editingId ? 'Update Task' : 'Create Task'}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading tasks...</p>
      ) : (
        <div className="tasks-list">
          {tasks.length === 0 ? (
            <p className="no-data">No tasks yet. Create one to get started!</p>
          ) : (
            tasks.map(task => (
              <div key={task.Task_ID} className={`task-card priority-${task.Priority?.toLowerCase()}`}>
                <div className="task-header">
                  <h3>{task.Task_Name}</h3>
                  <span className={`status-badge ${task.Status?.toLowerCase()}`}>
                    {task.Status}
                  </span>
                </div>
                {task.Description && <p className="description">{task.Description}</p>}
                <div className="task-meta">
                  <span>📅 {new Date(task.Due_Date).toLocaleDateString()}</span>
                  <span>🎯 {task.Priority}</span>
                  <span>📂 {task.Category}</span>
                </div>
                <div className="task-actions">
                  <button onClick={() => handleEdit(task)} className="btn-secondary">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(task.Task_ID)} className="btn-danger">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
