import API from '../utils/api';

const taskService = {
  createTask: (data) => API.post('/tasks', data),
  getAssignedTasks: () => API.get('/tasks/assigned'),
  getCreatedTasks: () => API.get('/tasks/created'),
  getHistoryTasks: (filters) => API.get('/tasks/history', { params: filters }),
  getNotifications: () => API.get('/tasks/notifications'),
  getPendingCount: () => API.get('/tasks/count'),
  updateTaskStatus: (id, formData) => API.put(`/tasks/${id}/status`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default taskService;
