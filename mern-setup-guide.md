# Complete MERN Stack Setup Guide



## Prerequisites

Before starting, ensure you have:
- **Node.js** (v18 or later) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MongoDB Atlas Account** - [Sign up at mongodb.com](https://www.mongodb.com/cloud/atlas/register)

---

## Part 1: MongoDB Atlas Setup

> **Video Tutorial:** [MongoDB Atlas Setup Guide](https://www.youtube.com/watch?v=7a2Nns23d_s) - Watch this video for a visual walkthrough of the MongoDB Atlas setup process.

### Step 1: Create MongoDB Atlas Account & Cluster

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. After login, click **"Build a Database"**
4. Select **M0 FREE** tier
5. Choose your preferred cloud provider and region (closest to you)
6. Name your cluster (e.g., `Cluster0`) and click **"Create"**

### Step 2: Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Set username (e.g., `mernuser`) and password (save this!)
5. Set privileges to **"Read and write to any database"**
6. Click **"Add User"**

### Step 3: Whitelist Your IP Address

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
   - This adds `0.0.0.0/0` (not recommended for production)
4. Click **"Confirm"**

### Step 4: Get Connection String

1. Go back to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **Driver: Node.js** and **Version: 5.5 or later**
5. Copy the connection string (looks like):
   ```
   mongodb+srv://<db_username>:<db_password>@cluster0.wu9s4.mongodb.net/?appName=Cluster0
   ```
6. Replace `<password>` with your actual password
7. Save this connection string - you'll need it later!

---

## Part 2: Backend Setup (Node.js + Express + MongoDB)

### Step 1: Create Project Structure

```bash
# Create main project folder
mkdir mern-app
cd mern-app

# Create backend folder
mkdir backend
cd backend
```

### Step 2: Initialize Node.js Project

```bash
# Initialize npm
npm init -y
```

### Step 3: Install Dependencies

```bash
# Install production dependencies
npm install express mongoose cors dotenv

# Install development dependencies
npm install --save-dev nodemon
```

**What each package does:**
- `express` - Web framework for Node.js
- `mongoose` - MongoDB object modeling tool
- `cors` - Enable Cross-Origin Resource Sharing
- `dotenv` - Load environment variables from .env file
- `nodemon` - Auto-restart server on file changes (dev only)

### Step 4: Create Folder Structure

```bash
# Create necessary folders
mkdir config models routes controllers

# Create main files
touch server.js .env .gitignore
```

Your backend folder should look like:
```
backend/
├── config/
├── models/
├── routes/
├── controllers/
├── server.js
├── .env
├── .gitignore
└── package.json
```

### Step 5: Configure Environment Variables

Create `.env` file:
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://mernuser:yourpassword@cluster0.xxxxx.mongodb.net/mern-app?retryWrites=true&w=majority

# Server Port
PORT=5000

# Node Environment
NODE_ENV=development
```

**Important:** Replace the MongoDB URI with your actual connection string from Atlas!

### Step 6: Create .gitignore

Create `.gitignore` file:
```
node_modules/
.env
.DS_Store
```

### Step 7: Create Database Connection

Create `config/db.js`:
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Step 8: Create a Sample Model

Create `models/Task.js`:
```javascript
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('Task', taskSchema);
```

### Step 9: Create Controller

Create `controllers/taskController.js`:
```javascript
const Task = require('../models/Task');

// @desc    Get all tasks
// @route   GET /api/tasks
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
const createTask = async (req, res) => {
  try {
    const task = await Task.create(req.body);
    
    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true, // Run model validators
      }
    );
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
};
```

### Step 10: Create Routes

Create `routes/taskRoutes.js`:
```javascript
const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

// /api/tasks
router.route('/')
  .get(getTasks)
  .post(createTask);

// /api/tasks/:id
router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;
```

### Step 11: Create Main Server File

Create `server.js`:
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/tasks', require('./routes/taskRoutes'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MERN API' });
});

// Error handler (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### Step 12: Update package.json Scripts

Edit `package.json` and add scripts:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "MERN backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "server": "nodemon server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "mongoose": "^8.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}
```

### Step 13: Test Backend with Nodemon

```bash
# Start the server with nodemon (auto-restart on changes)
npm run dev
```

**What is Nodemon?**
Nodemon automatically restarts your Node.js server when file changes are detected. This is perfect for development!

You should see:
```
Server is running on port 5000
MongoDB Connected: cluster0-xxxxx.mongodb.net
```

**Test the API:**
- Visit `http://localhost:5000` in your browser
- You should see: `{"message":"Welcome to MERN API"}`

**Test with curl or Postman:**
```bash
# Create a task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn MERN","description":"Build a full-stack app"}'

# Get all tasks
curl http://localhost:5000/api/tasks
```

---

## Part 3: Frontend Setup (React + Vite)

### Step 1: Create Vite React App

Open a **new terminal** (keep backend running), navigate to main project folder:

```bash
# Go back to main project folder
cd ..  # You should be in mern-app/

# Create Vite React app
npm create vite@latest frontend -- --template react

# Navigate to frontend
cd frontend

# Install dependencies
npm install
```

### Step 2: Install Additional Dependencies

```bash
# Install Axios for API calls
npm install axios

# Optional: Install React Router (for multiple pages)
npm install react-router-dom
```

### Step 3: Create Folder Structure

```bash
# Create organized folder structure
mkdir -p src/components src/pages src/services src/utils
```

Your frontend folder should look like:
```
frontend/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

### Step 4: Configure API Base URL

Create `src/services/api.js`:
```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Task API endpoints
export const taskAPI = {
  // Get all tasks
  getAllTasks: () => api.get('/tasks'),
  
  // Get single task
  getTask: (id) => api.get(`/tasks/${id}`),
  
  // Create task
  createTask: (taskData) => api.post('/tasks', taskData),
  
  // Update task
  updateTask: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  
  // Delete task
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

export default api;
```

### Step 5: Create Task Components

Create `src/components/TaskItem.jsx`:
```jsx
import React from 'react';

const TaskItem = ({ task, onToggle, onDelete }) => {
  return (
    <div className="task-item">
      <div className="task-content">
        <h3 style={{ 
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? '#888' : '#333'
        }}>
          {task.title}
        </h3>
        {task.description && <p>{task.description}</p>}
        <small>
          Created: {new Date(task.createdAt).toLocaleDateString()}
        </small>
      </div>
      <div className="task-actions">
        <button 
          onClick={() => onToggle(task)}
          className={task.completed ? 'btn-undo' : 'btn-complete'}
        >
          {task.completed ? 'Undo' : 'Complete'}
        </button>
        <button 
          onClick={() => onDelete(task._id)}
          className="btn-delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
```

Create `src/components/TaskForm.jsx`:
```jsx
import React, { useState } from 'react';

const TaskForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.title.trim()) {
      onSubmit(formData);
      setFormData({ title: '', description: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Task title *"
          required
        />
      </div>
      <div className="form-group">
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Task description (optional)"
          rows="3"
        />
      </div>
      <button type="submit" className="btn-submit">
        Add Task
      </button>
    </form>
  );
};

export default TaskForm;
```

### Step 6: Create Main App

Update `src/App.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { taskAPI } from './services/api';
import TaskForm from './components/TaskForm';
import TaskItem from './components/TaskItem';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getAllTasks();
      setTasks(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch tasks. Make sure backend is running.');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const response = await taskAPI.createTask(taskData);
      setTasks([response.data.data, ...tasks]);
    } catch (err) {
      alert('Failed to create task');
      console.error('Error creating task:', err);
    }
  };

  const handleToggleTask = async (task) => {
    try {
      const updatedData = { completed: !task.completed };
      const response = await taskAPI.updateTask(task._id, updatedData);
      setTasks(tasks.map(t => 
        t._id === task._id ? response.data.data : t
      ));
    } catch (err) {
      alert('Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskAPI.deleteTask(id);
        setTasks(tasks.filter(task => task._id !== id));
      } catch (err) {
        alert('Failed to delete task');
        console.error('Error deleting task:', err);
      }
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="app-header">
          <h1>MERN Task Manager</h1>
          <p>Full-Stack App with MongoDB, Express, React & Node.js</p>
        </header>

        <div className="app-content">
          <section className="form-section">
            <h2>Create New Task</h2>
            <TaskForm onSubmit={handleCreateTask} />
          </section>

          <section className="tasks-section">
            <h2>Tasks ({tasks.length})</h2>
            
            {loading && <p className="loading">Loading tasks...</p>}
            
            {error && <p className="error">{error}</p>}
            
            {!loading && !error && tasks.length === 0 && (
              <p className="empty-state">No tasks yet. Create one above!</p>
            )}
            
            {!loading && !error && tasks.length > 0 && (
              <div className="tasks-list">
                {tasks.map(task => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
```

### Step 7: Add Styling

Update `src/App.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.app {
  min-height: 100vh;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.app-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
  padding: 30px;
}

.app-header h1 {
  font-size: 3rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
}

.app-header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.app-content {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  overflow: hidden;
}

.form-section,
.tasks-section {
  padding: 30px;
}

.form-section {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.form-section h2,
.tasks-section h2 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
}

.task-form .form-group {
  margin-bottom: 15px;
}

.task-form input,
.task-form textarea {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.task-form input:focus,
.task-form textarea:focus {
  outline: none;
  border-color: #667eea;
}

.task-form textarea {
  resize: vertical;
}

.btn-submit {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-submit:active {
  transform: translateY(0);
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #667eea;
  transition: transform 0.2s, box-shadow 0.2s;
}

.task-item:hover {
  transform: translateX(5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.task-content {
  flex: 1;
}

.task-content h3 {
  margin-bottom: 5px;
  font-size: 1.2rem;
}

.task-content p {
  color: #666;
  margin-bottom: 8px;
}

.task-content small {
  color: #999;
  font-size: 0.85rem;
}

.task-actions {
  display: flex;
  gap: 10px;
}

.task-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: transform 0.2s, opacity 0.2s;
}

.task-actions button:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.btn-complete {
  background: #10b981;
  color: white;
}

.btn-undo {
  background: #f59e0b;
  color: white;
}

.btn-delete {
  background: #ef4444;
  color: white;
}

.loading,
.error,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 1.1rem;
}

.error {
  color: #ef4444;
  background: #fee2e2;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 2rem;
  }
  
  .task-item {
    flex-direction: column;
    gap: 15px;
  }
  
  .task-actions {
    width: 100%;
    justify-content: space-between;
  }
}
```

Update `src/index.css`:
```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

body {
  margin: 0;
  display: flex;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
}
```

### Step 8: Run Frontend

```bash
# Make sure you're in frontend directory
npm run dev
```

The app will open at `http://localhost:3000`

---

## Part 4: Running Full Stack Application

### Method 1: Two Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Method 2: Using Concurrently (Optional)

From the root `mern-app` directory:

```bash
# Initialize package.json in root
npm init -y

# Install concurrently
npm install --save-dev concurrently
```

Update root `package.json`:
```json
{
  "scripts": {
    "server": "cd backend && npm run dev",
    "client": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run server\" \"npm run client\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Now you can run both with:
```bash
npm run dev
```

---

