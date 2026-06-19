import API from '../utils/api';

const taskService = {
  createTask: (data) => API.post('/tasks', data),
  getAllTasks: (params) => API.get('/tasks', { params }),
  getAssignedTasks: () => API.get('/tasks/assigned'),
  getCreatedTasks: () => API.get('/tasks/created'),
  getHistoryTasks: (filters) => API.get('/tasks/history', { params: filters }),
  getNotifications: () => API.get('/tasks/notifications'),
  getPendingCount: () => API.get('/tasks/count'),
  getTaskStats: () => API.get('/tasks/stats'),
  getTaskLogs: (id) => API.get(`/tasks/${id}/logs`),
  updateTaskStatus: (id, formData) => API.put(`/tasks/${id}/status`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  batchUpdateStatus: (taskIds, status) => API.put('/tasks/batch/status', { taskIds, status }),
  markNotificationRead: (id) => API.put(`/tasks/notifications/${id}/read`),
  generateOngoing: () => API.post('/tasks/generate-ongoing'),
};

export default taskService;
