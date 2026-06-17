import API from '../utils/api';

const taskService = {
  createTask: (data) => API.post('/tasks', data),
  getAssignedTasks: () => API.get('/tasks/assigned'),
  getCreatedTasks: () => API.get('/tasks/created'),
  getHistoryTasks: () => API.get('/tasks/history'),
  updateTaskStatus: (id, data) => API.put(`/tasks/${id}/status`, data),
};

export default taskService;
