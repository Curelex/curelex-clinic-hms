import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import taskService from '../services/taskService';
import TaskCard from '../components/TaskCard';

export default function TaskAllocation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('myTasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', description: '', priority: 'Medium', deadline: '', 
    assignedTo: '', assignedRole: '', files: [] 
  });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let data;
      if (activeTab === 'myTasks') {
        ({ data } = await taskService.getAssignedTasks());
      } else if (activeTab === 'assignedByMe') {
        ({ data } = await taskService.getCreatedTasks());
      } else {
        ({ data } = await taskService.getHistoryTasks());
      }
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    for (const key in formData) {
      if (key === 'files') {
        for (let i = 0; i < formData.files.length; i++) fd.append('files', formData.files[i]);
      } else {
        fd.append(key, formData[key]);
      }
    }
    await taskService.createTask(fd);
    setShowAddForm(false);
    setFormData({ title: '', description: '', priority: 'Medium', deadline: '', assignedTo: '', assignedRole: '', files: [] });
    fetchTasks();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Task Allocation</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('myTasks')}>My Tasks</button>
        {user?.role === 'admin' && (
          <>
            <button onClick={() => setActiveTab('assignedByMe')}>Assigned By Me</button>
            <button onClick={() => setShowAddForm(true)}>+ Add New Task</button>
          </>
        )}
        <button onClick={() => setActiveTab('history')}>History</button>
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateTask} className="card" style={{ marginBottom: 20, padding: 20 }}>
          <input placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ display: 'block', width: '100%', marginBottom: 10 }} />
          <textarea placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required style={{ display: 'block', width: '100%', marginBottom: 10, height: 100 }} />
          
          <select value={formData.assignedRole} onChange={e => setFormData({...formData, assignedRole: e.target.value})} required style={{ display: 'block', width: '100%', marginBottom: 10 }}>
            <option value="">Select Role</option>
            <option value="nurse">Nursing Staff</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="lab_technician">Lab Technician</option>
          </select>

          <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} required style={{ display: 'block', width: '100%', marginBottom: 10 }} />
          <input type="file" multiple onChange={e => setFormData({...formData, files: e.target.files})} style={{ display: 'block', width: '100%', marginBottom: 10 }} />
          <button type="submit">Submit Task</button>
          <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
        </form>
      )}
      
      {loading ? <p>Loading...</p> : (
        <div>
          {tasks.map(task => (
            <TaskCard key={task._id} task={task} onUpdate={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
}
