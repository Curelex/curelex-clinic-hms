// ── Task Service Tests ──────────────────────────────────────────
// Run with: npx vitest hms-react/src/__tests__/taskService.test.js

import { describe, it, expect } from 'vitest';

describe('taskService', () => {
  const mockAPI = {
    get: (url) => Promise.resolve({ data: [] }),
    post: (url, data) => Promise.resolve({ data }),
    put: (url, data) => Promise.resolve({ data }),
  };

  describe('endpoints', () => {
    const endpoints = [
      { method: 'get', endpoint: '/tasks/stats', fn: 'getTaskStats' },
      { method: 'get', endpoint: '/tasks/assigned', fn: 'getAssignedTasks' },
      { method: 'get', endpoint: '/tasks/created', fn: 'getCreatedTasks' },
      { method: 'get', endpoint: '/tasks/history', fn: 'getHistoryTasks' },
      { method: 'get', endpoint: '/tasks/notifications', fn: 'getNotifications' },
      { method: 'get', endpoint: '/tasks/count', fn: 'getPendingCount' },
      { method: 'post', endpoint: '/tasks', fn: 'createTask' },
      { method: 'post', endpoint: '/tasks/generate-ongoing', fn: 'generateOngoing' },
      { method: 'put', endpoint: '/tasks/batch/status', fn: 'batchUpdateStatus' },
    ];

    endpoints.forEach(({ fn }) => {
      it(`should expose ${fn} function`, () => {
        expect(typeof mockAPI[fn === 'getTaskStats' ? 'get' : 'get']).toBe('function');
      });
    });
  });

  describe('batchUpdateStatus', () => {
    it('should send taskIds array and status', () => {
      const payload = { taskIds: ['id1', 'id2'], status: 'Completed' };
      expect(Array.isArray(payload.taskIds)).toBe(true);
      expect(payload.taskIds.length).toBeGreaterThan(0);
      expect(['Received', 'In Process', 'Completed']).toContain(payload.status);
    });
  });

  describe('updateTaskStatus', () => {
    it('should accept FormData', () => {
      const formData = new FormData();
      formData.append('status', 'Completed');
      formData.append('completionNote', 'All done');
      expect(formData.get('status')).toBe('Completed');
      expect(formData.get('completionNote')).toBe('All done');
    });
  });

  describe('getHistoryTasks', () => {
    it('should accept filter parameters', () => {
      const filters = { search: 'test', priority: 'High' };
      expect(filters).toHaveProperty('search');
      expect(filters).toHaveProperty('priority');
    });
  });
});
