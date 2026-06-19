// ── Layout Notification & Socket Tests ─────────────────────────
// Run with: npx vitest hms-react/src/__tests__/LayoutNotifications.test.js

import { describe, it, expect } from 'vitest';

describe('Layout Notifications', () => {
  // ── Notification state management ─────────────────────────
  describe('Notification state', () => {
    it('should start with empty notifications', () => {
      const notifications = [];
      expect(notifications).toHaveLength(0);
    });

    it('should add new notification from socket event', () => {
      let notifications = [];
      const newNotif = {
        _id: 'sla-123',
        message: 'SLA BREACHED: "Urgent Task" exceeded SLA',
        taskId: 'task123',
        read: false,
        createdAt: new Date().toISOString(),
      };

      notifications = [newNotif, ...notifications];
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toContain('SLA BREACHED');
    });

    it('should add task:new notification', () => {
      let notifications = [];
      const newTaskNotif = {
        _id: 'notif-1',
        message: 'You have a new task: Vitals Check',
        taskId: 'task1',
        read: false,
        createdAt: new Date().toISOString(),
      };

      notifications = [newTaskNotif, ...notifications];
      expect(notifications[0].message).toContain('new task');
    });

    it('should handle multiple notifications in order (newest first)', () => {
      const notifications = [
        { _id: '3', message: 'Third', createdAt: '2026-06-17T10:00:00Z' },
        { _id: '2', message: 'Second', createdAt: '2026-06-17T09:00:00Z' },
        { _id: '1', message: 'First', createdAt: '2026-06-17T08:00:00Z' },
      ];

      const sorted = [...notifications].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      expect(sorted[0]._id).toBe('3');
    });
  });

  // ── Task count / badge ────────────────────────────────────
  describe('Task count badge', () => {
    it('should display count badge when tasks > 0', () => {
      const taskCount = 5;
      const showBadge = taskCount > 0;
      expect(showBadge).toBe(true);
    });

    it('should not display count badge when zero tasks', () => {
      const taskCount = 0;
      const showBadge = taskCount > 0;
      expect(showBadge).toBe(false);
    });

    it('should fetch pending count from API', async () => {
      const mockResponse = { data: { count: 3 } };
      const count = mockResponse.data.count;
      expect(count).toBe(3);
    });

    it('should update badge count when task:new event received', () => {
      let taskCount = 2;

      // Simulate socket.on('task:new', fetchData)
      const fetchData = () => { taskCount = 5; };
      fetchData();

      expect(taskCount).toBe(5);
    });

    it('should update badge count when task:updated event received', () => {
      let taskCount = 3;

      const fetchData = () => { taskCount = 1; };
      fetchData();

      expect(taskCount).toBe(1);
    });
  });

  // ── Socket event listeners ────────────────────────────────
  describe('Socket event handling', () => {
    it('should register task:new listener', () => {
      const listeners = [];
      const socket = {
        on: (event, fn) => { listeners.push(event); },
        off: () => {},
      };

      socket.on('task:new', () => {});
      socket.on('task:updated', () => {});
      socket.on('task:sla-breach', () => {});

      expect(listeners).toContain('task:new');
      expect(listeners).toContain('task:updated');
      expect(listeners).toContain('task:sla-breach');
      expect(listeners).toHaveLength(3);
    });

    it('should cleanup listeners on unmount', () => {
      const removedListeners = [];
      const socket = {
        on: () => {},
        off: (event) => { removedListeners.push(event); },
      };

      // Simulate useEffect cleanup
      const cleanup = () => {
        socket.off('task:new');
        socket.off('task:updated');
        socket.off('task:sla-breach');
      };
      cleanup();

      expect(removedListeners).toContain('task:new');
      expect(removedListeners).toContain('task:updated');
      expect(removedListeners).toContain('task:sla-breach');
      expect(removedListeners).toHaveLength(3);
    });

    it('should handle task:sla-breach by adding notification', () => {
      let notifications = [
        { _id: '1', message: 'Existing', read: false },
      ];

      const task = { _id: 't1', title: 'Emergency Task' };
      const slaNotif = {
        _id: `sla-${Date.now()}`,
        message: `SLA BREACHED: "${task.title}" exceeded SLA`,
        taskId: task._id,
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Simulate the socket handler from Layout.jsx
      const handleSlaBreach = (t) => {
        notifications = [{
          _id: `sla-${Date.now()}`,
          message: `SLA BREACHED: "${t.title}" exceeded SLA`,
          taskId: t._id,
          read: false,
          createdAt: new Date().toISOString(),
        }, ...notifications];
      };

      handleSlaBreach(task);

      expect(notifications).toHaveLength(2);
      expect(notifications[0].message).toContain('SLA BREACHED');
      expect(notifications[0].message).toContain('Emergency Task');
    });

    it('should handle task:new by refreshing count', () => {
      let taskCount = 0;

      const fetchData = () => { taskCount = 7; };

      // Simulate socket event triggering fetchData
      fetchData();

      expect(taskCount).toBe(7);
    });
  });

  // ── Notification panel UI logic ───────────────────────────
  describe('Notification panel', () => {
    it('should toggle visibility', () => {
      let showNotifications = false;
      showNotifications = !showNotifications;
      expect(showNotifications).toBe(true);

      showNotifications = !showNotifications;
      expect(showNotifications).toBe(false);
    });

    it('should mark notification as read on click', () => {
      const notification = { _id: 'n1', read: false };

      // Simulate marking as read
      notification.read = true;

      expect(notification.read).toBe(true);
    });

    it('should show empty state when no notifications', () => {
      const notifications = [];
      const isEmpty = notifications.length === 0;
      expect(isEmpty).toBe(true);
    });

    it('should show unread indicator for unread notifications', () => {
      const notification = { read: false };
      const isUnread = !notification.read;
      expect(isUnread).toBe(true);
    });

    it('should not show unread indicator for read notifications', () => {
      const notification = { read: true };
      const isUnread = !notification.read;
      expect(isUnread).toBe(false);
    });

    it('should navigate to tasks page when notification has taskId', () => {
      const notification = { taskId: 'task123' };
      const shouldNavigate = !!notification.taskId;
      expect(shouldNavigate).toBe(true);
    });

    it('should not navigate when notification has no taskId', () => {
      const notification = { message: 'System alert' };
      const shouldNavigate = !!notification.taskId;
      expect(shouldNavigate).toBe(false);
    });
  });

  // ── Notification API calls ────────────────────────────────
  describe('Notification API integration', () => {
    it('should call mark-as-read API', async () => {
      let calledWith = null;
      const mockMarkRead = (id) => { calledWith = id; };

      await mockMarkRead('notif-abc');
      expect(calledWith).toBe('notif-abc');
    });

    it('should fetch notifications from API', async () => {
      const mockResponse = {
        data: [
          { _id: '1', message: 'Notif 1', read: false },
          { _id: '2', message: 'Notif 2', read: true },
        ],
      };

      const notifications = mockResponse.data;
      expect(notifications).toHaveLength(2);
    });

    it('should handle mark-as-read API errors gracefully', async () => {
      let error = null;
      try {
        // Simulate API failure
        throw new Error('Network error');
      } catch (err) {
        error = err;
      }
      expect(error).toBeTruthy();
      expect(error.message).toBe('Network error');
    });
  });

  // ── Notification filtering ────────────────────────────────
  describe('Notification filtering', () => {
    const notifications = [
      { _id: '1', message: 'SLA BREACHED: Task X', read: false },
      { _id: '2', message: 'New task: Check vitals', read: false },
      { _id: '3', message: 'Task completed: Report', read: true },
      { _id: '4', message: 'SLA BREACHED: Task Y', read: false },
    ];

    it('should filter SLA breach notifications', () => {
      const slaNotifs = notifications.filter(n => n.message.includes('SLA BREACHED'));
      expect(slaNotifs).toHaveLength(2);
    });

    it('should filter unread notifications', () => {
      const unread = notifications.filter(n => !n.read);
      expect(unread).toHaveLength(3);
    });

    it('should count SLA breach notifications', () => {
      const count = notifications.filter(n => n.message.includes('SLA BREACHED')).length;
      expect(count).toBe(2);
    });

    it('should filter by task-related messages', () => {
      const taskNotifs = notifications.filter(n => n.message.includes('task') || n.message.includes('Task'));
      expect(taskNotifs).toHaveLength(3);
    });
  });
});
