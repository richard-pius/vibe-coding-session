// backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const ExcelDatabase = require('./lib/excelDatabase');
const initializeDatabase = require('./lib/initializeDatabase');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DB_PATH = path.join(__dirname, '../data/app_data.xlsx');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const initDB = async () => {
  try {
    const fs = require('fs');
    if (!fs.existsSync(path.dirname(DB_PATH))) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      await initializeDatabase(DB_PATH);
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

const db = new ExcelDatabase(DB_PATH);

// Auth middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

// ============= AUTH ROUTES =============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
      });
    }

    const existing = await db.findRow('Users', r => r.Email === email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    const userId = `USR_${uuidv4().substring(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const newUser = {
      User_ID: userId,
      Username: username,
      Email: email,
      Password_Hash: passwordHash,
      Created_At: now,
      Updated_At: now,
      Settings_JSON: JSON.stringify({ theme: 'light', currency: 'USD' }),
    };

    await db.appendRow('Users', newUser);

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: {
        token,
        User_ID: userId,
        Username: username,
        Email: email,
      },
      timestamp: now,
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const user = await db.findRow('Users', r => r.Email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.Password_Hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = jwt.sign({ userId: user.User_ID, email }, JWT_SECRET, { expiresIn: '7d' });
    const settings = JSON.parse(user.Settings_JSON || '{}');

    res.json({
      success: true,
      data: {
        token,
        User_ID: user.User_ID,
        Username: user.Username,
        Email: user.Email,
        settings,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// ============= TASKS ROUTES =============

app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { user_id, status, priority, category, sort } = req.query;

    const tasks = await db.findRows('Tasks', row => {
      if (user_id && row.User_ID !== user_id) return false;
      if (status && row.Status !== status) return false;
      if (priority && row.Priority !== priority) return false;
      if (category && row.Category !== category) return false;
      return true;
    });

    if (sort === 'due_date') {
      tasks.sort((a, b) => new Date(a.Due_Date) - new Date(b.Due_Date));
    }

    res.json({
      success: true,
      data: tasks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
    });
  }
});

app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { User_ID, Task_Name, Description, Due_Date, Status, Priority, Category, Recurring, Tags } = req.body;

    if (!User_ID || !Task_Name || !Due_Date) {
      return res.status(400).json({
        success: false,
        error: 'User_ID, Task_Name, and Due_Date are required',
      });
    }

    const taskId = `TSK_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const newTask = {
      Task_ID: taskId,
      User_ID,
      Task_Name,
      Description: Description || '',
      Due_Date,
      Status: Status || 'Pending',
      Priority: Priority || 'Medium',
      Category: Category || 'General',
      Recurring: Recurring || 'None',
      Estimated_Hours: 0,
      Actual_Hours: null,
      Related_Transaction_IDs: '',
      Created_At: now,
      Updated_At: now,
      Tags: Tags || '',
    };

    await db.appendRow('Tasks', newTask);

    res.status(201).json({
      success: true,
      data: newTask,
      timestamp: now,
    });
  } catch (error) {
    console.error('❌ Create task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
    });
  }
});

app.put('/api/tasks/:task_id', verifyToken, async (req, res) => {
  try {
    const task = await db.findRow('Tasks', r => r.Task_ID === req.params.task_id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    const updates = {
      ...req.body,
      Updated_At: new Date().toISOString(),
    };

    await db.updateRow('Tasks', task._rowNumber, updates);

    res.json({
      success: true,
      data: { ...task, ...updates },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Update task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
    });
  }
});

app.delete('/api/tasks/:task_id', verifyToken, async (req, res) => {
  try {
    const task = await db.findRow('Tasks', r => r.Task_ID === req.params.task_id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    await db.deleteRow('Tasks', task._rowNumber);

    res.json({
      success: true,
      data: { deletedTaskID: req.params.task_id },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Delete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
    });
  }
});

// ============= TRANSACTIONS ROUTES =============

app.get('/api/transactions', verifyToken, async (req, res) => {
  try {
    const { user_id, start_date, end_date, category, type } = req.query;

    const transactions = await db.findRows('Transactions', row => {
      if (user_id && row.User_ID !== user_id) return false;
      if (category && row.Category !== category) return false;
      if (type && row.Type !== type) return false;
      if (start_date && new Date(row.Date) < new Date(start_date)) return false;
      if (end_date && new Date(row.Date) > new Date(end_date)) return false;
      return true;
    });

    res.json({
      success: true,
      data: transactions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
    });
  }
});

app.post('/api/transactions', verifyToken, async (req, res) => {
  try {
    const { User_ID, Task_ID, Date: DateStr, Amount, Currency, Type, Category, Subcategory, Description, Payment_Method, Tags } = req.body;

    if (!User_ID || !DateStr || !Amount || !Type || !Category) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: User_ID, Date, Amount, Type, Category',
      });
    }

    const transactionId = `TRX_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const newTransaction = {
      Transaction_ID: transactionId,
      User_ID,
      Task_ID: Task_ID || null,
      Date: DateStr,
      Amount,
      Currency: Currency || 'USD',
      Type,
      Category,
      Subcategory: Subcategory || '',
      Description: Description || '',
      Payment_Method: Payment_Method || 'Not Specified',
      Status: 'Completed',
      Tags: Tags || '',
      Created_At: now,
      Updated_At: now,
    };

    await db.appendRow('Transactions', newTransaction);

    res.status(201).json({
      success: true,
      data: newTransaction,
      timestamp: now,
    });
  } catch (error) {
    console.error('❌ Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction',
    });
  }
});

app.put('/api/transactions/:transaction_id', verifyToken, async (req, res) => {
  try {
    const transaction = await db.findRow('Transactions', r => r.Transaction_ID === req.params.transaction_id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    const updates = {
      ...req.body,
      Updated_At: new Date().toISOString(),
    };

    await db.updateRow('Transactions', transaction._rowNumber, updates);

    res.json({
      success: true,
      data: { ...transaction, ...updates },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Update transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transaction',
    });
  }
});

app.delete('/api/transactions/:transaction_id', verifyToken, async (req, res) => {
  try {
    const transaction = await db.findRow('Transactions', r => r.Transaction_ID === req.params.transaction_id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    await db.deleteRow('Transactions', transaction._rowNumber);

    res.json({
      success: true,
      data: { deletedTransactionID: req.params.transaction_id },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Delete transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete transaction',
    });
  }
});

// ============= DASHBOARD ROUTES =============

app.get('/api/dashboard/summary', verifyToken, async (req, res) => {
  try {
    const { user_id, month, year } = req.query;

    const transactions = await db.findRows('Transactions', r =>
      r.User_ID === user_id &&
      new Date(r.Date).getMonth() + 1 === parseInt(month) &&
      new Date(r.Date).getFullYear() === parseInt(year)
    );

    const tasks = await db.findRows('Tasks', r => r.User_ID === user_id);

    const totalIncome = transactions
      .filter(t => t.Type === 'Income')
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const totalExpenses = transactions
      .filter(t => t.Type === 'Expense')
      .reduce((sum, t) => sum + (parseFloat(t.Amount) || 0), 0);

    const completedTasks = tasks.filter(t => t.Status === 'Completed').length;

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        savingsRate: totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0,
        taskCompletionRate: tasks.length > 0 ? completedTasks / tasks.length : 0,
        upcomingTasks: tasks.filter(t => t.Status !== 'Completed').length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, async () => {
  await initDB();
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
});

module.exports = app;
