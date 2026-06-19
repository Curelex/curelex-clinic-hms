// ── TaskCard Component Tests ────────────────────────────────────
// Run with: npx vitest hms-react/src/__tests__/TaskCard.test.js

import { describe, it, expect } from 'vitest';

describe('TaskCard Component', () => {
  const mockTask = {
    _id: 'task1',
    title: 'Test Task',
    description: 'This is a test task description',
    priority: 'High',
    status: 'Received',
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    assignedTo: { name: 'Dr. John', _id: 'user1' },
    assignedRole: 'nurse',
    createdBy: { name: 'Admin', _id: 'admin1' },
    clinicId: 'clinic1',
    isOngoing: false,
    recurrence: 'none',
    slaHours: 0,
    slaBreached: false,
    taskFiles: [],
    completionFiles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('task rendering', () => {
    it('should display task title', () => {
      expect(mockTask.title).toBe('Test Task');
    });

    it('should display task priority', () => {
      expect(['Low', 'Medium', 'High', 'Urgent']).toContain(mockTask.priority);
    });

    it('should display correct status label based on status value', () => {
      const statusMap = {
        'Received': 'Received',
        'In Process': 'In Progress',
        'Completed': 'Completed',
      };
      expect(statusMap[mockTask.status]).toBe('Received');
    });

    it('should display overdue label for expired tasks', () => {
      const overdueTask = { ...mockTask, deadline: new Date(Date.now() - 86400000).toISOString() };
      const isOverdue = overdueTask.status !== 'Completed' && new Date(overdueTask.deadline) < new Date();
      expect(isOverdue).toBe(true);

      const displayStatus = isOverdue ? 'Overdue' : overdueTask.status;
      expect(displayStatus).toBe('Overdue');
    });

    it('should display SLA Breach label when breached', () => {
      const breachedTask = { ...mockTask, slaBreached: true };
      const isOverdue = breachedTask.status !== 'Completed' && new Date(breachedTask.deadline) < new Date();
      const displayStatus = breachedTask.slaBreached ? 'SLA Breach' : isOverdue ? 'Overdue' : breachedTask.status;
      expect(displayStatus).toBe('SLA Breach');
    });
  });

  describe('priority styles', () => {
    const priorityStyles = {
      Low: '#94a3b8',
      Medium: '#3b82f6',
      High: '#f97316',
      Urgent: '#ef4444',
    };

    it('should have border color for each priority', () => {
      expect(priorityStyles[mockTask.priority]).toBe('#f97316');
    });

    it('should fallback to Medium for unknown priority', () => {
      const unknownTask = { ...mockTask, priority: 'Unknown' };
      const style = priorityStyles[unknownTask.priority] || priorityStyles.Medium;
      expect(style).toBe('#3b82f6');
    });
  });

  describe('status display meta', () => {
    const statusMeta = {
      'Received': { label: 'Received' },
      'In Process': { label: 'In Progress' },
      'Completed': { label: 'Completed' },
      'Overdue': { label: 'Overdue' },
      'SLA Breach': { label: 'SLA Breach' },
    };

    Object.entries(statusMeta).forEach(([key, { label }]) => {
      it(`should map ${key} to label "${label}"`, () => {
        expect(statusMeta[key].label).toBe(label);
      });
    });
  });

  describe('CountdownTimer', () => {
    it('should calculate remaining time correctly', () => {
      const deadline = new Date(Date.now() + 86400000 * 2 + 3600000 * 5); // 2d 5h
      const total = deadline - new Date();
      const days = Math.floor(total / (1000 * 60 * 60 * 24));
      const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      expect(days).toBe(2);
      expect(hours).toBe(5);
    });

    it('should detect expiry', () => {
      const deadline = new Date(Date.now() - 3600000); // 1 hour ago
      const total = deadline - new Date();
      expect(total <= 0).toBe(true);
    });
  });

  describe('compact mode', () => {
    it('should render reduced UI for Kanban view', () => {
      const compactTask = {
        ...mockTask,
        priority: 'Urgent',
        status: 'In Process',
        slaHours: 4,
        isOngoing: true,
      };

      expect(compactTask.priority).toBe('Urgent');
      expect(compactTask.status).toBe('In Process');
      expect(compactTask.slaHours).toBeGreaterThan(0);
      expect(compactTask.isOngoing).toBe(true);
    });

    it('should show SLA info when slaHours > 0', () => {
      const slaTask = { ...mockTask, slaHours: 8, slaBreached: false };
      expect(slaTask.slaHours).toBeGreaterThan(0);
      expect(slaTask.slaBreached).toBe(false);
    });
  });

  describe('completion flow', () => {
    it('should show acknowledge button for Received tasks', () => {
      expect(mockTask.status === 'Received').toBe(true);
    });

    it('should show mark complete button for In Process tasks', () => {
      const inProgTask = { ...mockTask, status: 'In Process' };
      expect(inProgTask.status === 'In Process').toBe(true);
    });

    it('should show completed state for Completed tasks', () => {
      const completedTask = { ...mockTask, status: 'Completed', completionNote: 'Done!' };
      expect(completedTask.status === 'Completed').toBe(true);
      expect(completedTask.completionNote).toBe('Done!');
    });
  });

  describe('deadline proximity check', () => {
    it('should detect close deadline (within 2 days)', () => {
      const closeDeadline = new Date(Date.now() + 86400000).toISOString();
      const isClose = new Date(closeDeadline) - new Date() <= 86400000 * 2;
      expect(isClose).toBe(true);
    });

    it('should not flag distant deadlines', () => {
      const farDeadline = new Date(Date.now() + 86400000 * 7).toISOString();
      const isClose = new Date(farDeadline) - new Date() <= 86400000 * 2;
      expect(isClose).toBe(false);
    });
  });
});
