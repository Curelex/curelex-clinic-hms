import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import taskService from '../services/taskService';

export default function TaskAllocation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('myTasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleStatusChange = async (taskId, status, note, files) => {
    const formData = new FormData();
    formData.append('status', status);
    if (note) formData.append('completionNote', note);
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }
    await taskService.updateTaskStatus(taskId, formData);
    fetchTasks();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Task Allocation</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('myTasks')}>My Tasks</button>
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('assignedByMe')}>Assigned By Me</button>
        )}
        <button onClick={() => setActiveTab('history')}>History</button>
      </div>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Title</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Status</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Priority</th>
              <th style={{ border: '1px solid #ccc', padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task._id}>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{task.title}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{task.status}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>{task.priority}</td>
                <td style={{ border: '1px solid #ccc', padding: 8 }}>
                  {task.status !== 'Completed' && (
                    <button onClick={() => handleStatusChange(task._id, 'Completed', 'Done', null)}>Complete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
