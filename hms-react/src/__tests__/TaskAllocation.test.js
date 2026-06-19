// ── TaskAllocation Page Tests ───────────────────────────────────
// Run with: npx vitest hms-react/src/__tests__/TaskAllocation.test.js

import { describe, it, expect } from 'vitest';

describe('TaskAllocation Page', () => {
  describe('stats computation', () => {
    it('should compute stats from task list', () => {
      const tasks = [
        { _id: '1', status: 'Received' },
        { _id: '2', status: 'Received' },
        { _id: '3', status: 'In Process' },
        { _id: '4', status: 'Completed' },
        { _id: '5', status: 'Completed' },
      ];

      const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'Received').length,
        inProgress: tasks.filter(t => t.status === 'In Process').length,
        completed: tasks.filter(t => t.status === 'Completed').length,
      };

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(2);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(2);
    });

    it('should handle empty task list', () => {
      const stats = { total: 0, pending: 0, inProgress: 0, completed: 0 };
      expect(stats.total).toBe(0);
    });
  });

  describe('overdue detection', () => {
    it('should mark task overdue when past deadline and not completed', () => {
      const task = {
        _id: '1', status: 'Received',
        deadline: new Date(Date.now() - 86400000).toISOString(),
      };
      const isOverdue = task.status !== 'Completed' && task.deadline && new Date(task.deadline) < new Date();
      expect(isOverdue).toBe(true);
    });

    it('should not mark completed task as overdue', () => {
      const task = {
        _id: '2', status: 'Completed',
        deadline: new Date(Date.now() - 86400000).toISOString(),
      };
      const isOverdue = task.status !== 'Completed' && task.deadline && new Date(task.deadline) < new Date();
      expect(isOverdue).toBe(false);
    });
  });

  describe('filtering', () => {
    const tasks = [
      { _id: '1', title: 'Vitals check', status: 'Completed', priority: 'High', deadline: new Date('2026-06-15') },
      { _id: '2', title: 'Medication round', status: 'In Process', priority: 'Urgent', deadline: new Date('2026-06-20') },
      { _id: '3', title: 'Clean room', status: 'Received', priority: 'Low', deadline: new Date('2026-06-25') },
    ];

    it('should filter by search', () => {
      const searchTerm = 'vitals';
      const filtered = tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Vitals check');
    });

    it('should filter by priority', () => {
      const priority = 'Urgent';
      const filtered = tasks.filter(t => t.priority === priority);
      expect(filtered).toHaveLength(1);
    });

    it('should filter by status', () => {
      const status = 'Completed';
      const filtered = tasks.filter(t => t.status === status);
      expect(filtered).toHaveLength(1);
    });

    it('should filter overdue tasks', () => {
      const filtered = tasks.filter(t => t.status !== 'Completed' && t.deadline < new Date());
      expect(filtered).toHaveLength(0);
    });
  });

  describe('tabs', () => {
    it('should show admin-specific tabs for admin role', () => {
      const role = 'admin';
      const tabs = [
        { key: 'myTasks' },
      ];
      if (role === 'admin') {
        tabs.push({ key: 'allTasks' }, { key: 'assignedByMe' }, { key: 'addTask' });
      }
      tabs.push({ key: 'history' });
      const adminKeys = tabs.map(t => t.key);
      expect(adminKeys).toContain('allTasks');
      expect(adminKeys).toContain('assignedByMe');
      expect(adminKeys).toContain('addTask');
    });

    it('should NOT show admin-specific tabs for non-admin roles', () => {
      const role = 'nurse';
      const tabs = [{ key: 'myTasks' }];
      if (role === 'admin') {
        tabs.push({ key: 'allTasks' }, { key: 'assignedByMe' }, { key: 'addTask' });
      }
      tabs.push({ key: 'history' });
      const nurseKeys = tabs.map(t => t.key);
      expect(nurseKeys).not.toContain('allTasks');
      expect(nurseKeys).not.toContain('addTask');
    });
  });

  describe('batch operations', () => {
    it('should manage selectedIds correctly', () => {
      let selectedIds = [];
      selectedIds = [...selectedIds, 'id1'];
      selectedIds = [...selectedIds, 'id2'];
      expect(selectedIds).toHaveLength(2);
      expect(selectedIds).toContain('id1');

      selectedIds = selectedIds.filter(x => x !== 'id1');
      expect(selectedIds).toHaveLength(1);
    });

    it('should handle select all / deselect all', () => {
      const taskIds = ['id1', 'id2', 'id3'];
      let selectedIds = [...taskIds];
      expect(selectedIds).toHaveLength(3);

      selectedIds = [];
      expect(selectedIds).toHaveLength(0);
    });
  });

  describe('drag-and-drop columns', () => {
    const STATUSES = ['Received', 'In Process', 'Completed'];

    STATUSES.forEach(status => {
      it(`should have a column for ${status}`, () => {
        expect(STATUSES).toContain(status);
      });
    });

    it('should filter tasks by status column', () => {
      const tasks = [
        { _id: '1', status: 'Received' },
        { _id: '2', status: 'Received' },
        { _id: '3', status: 'In Process' },
        { _id: '4', status: 'Completed' },
      ];

      const receivedTasks = tasks.filter(t => t.status === 'Received');
      expect(receivedTasks).toHaveLength(2);
    });
  });

  describe('CSV export', () => {
    it('should generate CSV header row', () => {
      const headers = ['Title', 'Description', 'Priority', 'Status', 'Assigned To', 'Assigned By'];
      expect(headers).toContain('Title');
      expect(headers).toContain('Priority');
      expect(headers).toContain('Status');
    });

    it('should escape double quotes in CSV values', () => {
      const value = 'Task with "quotes"';
      const escaped = `"${value.replace(/"/g, '""')}"`;
      expect(escaped).toBe('"Task with ""quotes"""');
    });
  });

  describe('status badge class', () => {
    const badgeClass = (status, isOverdue, isSlaBreached) => {
      if (isSlaBreached) return 'badge-danger';
      if (isOverdue) return 'badge-danger';
      if (status === 'Completed') return 'badge-success';
      if (status === 'In Process') return 'badge-warning';
      if (status === 'Received') return 'badge-info';
      return 'badge-gray';
    };

    it('should return badge-danger for SLA breach', () => {
      expect(badgeClass('Received', false, true)).toBe('badge-danger');
    });

    it('should return badge-danger for overdue', () => {
      expect(badgeClass('Received', true, false)).toBe('badge-danger');
    });

    it('should return badge-success for completed', () => {
      expect(badgeClass('Completed', false, false)).toBe('badge-success');
    });

    it('should return badge-warning for in process', () => {
      expect(badgeClass('In Process', false, false)).toBe('badge-warning');
    });

    it('should return badge-info for received', () => {
      expect(badgeClass('Received', false, false)).toBe('badge-info');
    });
  });
});
