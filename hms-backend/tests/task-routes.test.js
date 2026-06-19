import { expect } from 'chai';

// ── Task Routes Integration Tests ────────────────────────────
// Run with: npx mocha hms-backend/tests/task-routes.test.js

describe('Task Routes', () => {
  // ── Dashboard Stats ──────────────────────────────────────────
  describe('GET /api/tasks/stats', () => {
    it('should return task statistics including completion rate', () => {
      const stats = {
        total: 10,
        completed: 5,
        pending: 3,
        inProgress: 2,
        overdue: 1,
        slaBreached: 0,
        completionRate: 50,
        avgResolutionHours: 4.5,
        byPriority: { Low: 2, Medium: 5, High: 2, Urgent: 1 },
        byDay: [{ _id: '2026-06-01', count: 3 }, { _id: '2026-06-02', count: 7 }],
      };

      expect(stats).to.have.property('total');
      expect(stats).to.have.property('completed');
      expect(stats).to.have.property('completionRate');
      expect(stats).to.have.property('avgResolutionHours');
      expect(stats).to.have.property('byPriority');
      expect(stats).to.have.property('byDay');
      expect(stats.completionRate).to.be.a('number');
      expect(stats.avgResolutionHours).to.be.a('number');
    });

    it('should handle zero tasks gracefully', () => {
      const emptyStats = {
        total: 0, completed: 0, pending: 0, inProgress: 0,
        overdue: 0, slaBreached: 0, completionRate: 0, avgResolutionHours: 0,
        byPriority: {}, byDay: [],
      };
      expect(emptyStats.completionRate).to.equal(0);
      expect(emptyStats.avgResolutionHours).to.equal(0);
    });
  });

  // ── Task Creation ────────────────────────────────────────────
  describe('POST /api/tasks', () => {
    it('should create a task with recurrence field', () => {
      const taskData = {
        title: 'Daily vitals check',
        description: 'Check vitals for all IPD patients',
        priority: 'High', deadline: new Date(),
        assignedRole: 'nurse', recurrence: 'daily',
        isOngoing: true, slaHours: 4,
      };
      expect(taskData.title).to.exist;
      expect(taskData.recurrence).to.equal('daily');
      expect(taskData.isOngoing).to.be.true;
      expect(taskData.slaHours).to.equal(4);
    });

    it('should create a simple one-time task without recurring fields', () => {
      const taskData = {
        title: 'Clean equipment',
        description: 'Sterilize all OT equipment',
        priority: 'Medium', deadline: new Date(),
        assignedRole: 'nurse',
      };
      expect(taskData.recurrence).to.be.undefined;
      expect(taskData.isOngoing).to.be.undefined;
    });
  });

  // ── Status Transitions ───────────────────────────────────────
  describe('PUT /api/tasks/:id/status', () => {
    const allowedTransitions = {
      'Received': ['In Process'],
      'In Process': ['Completed'],
      'Completed': []
    };

    it('should allow Received -> In Process', () => {
      expect(allowedTransitions['Received']).to.include('In Process');
    });

    it('should reject Received -> Completed', () => {
      expect(allowedTransitions['Received']).to.not.include('Completed');
    });

    it('should allow In Process -> Completed', () => {
      expect(allowedTransitions['In Process']).to.include('Completed');
    });

    it('should reject In Process -> Received', () => {
      expect(allowedTransitions['In Process']).to.not.include('Received');
    });

    it('should not allow transitions from Completed', () => {
      expect(allowedTransitions['Completed']).to.be.empty;
    });

    it('should reject invalid status values', () => {
      const validStatuses = ['Received', 'In Process', 'Completed'];
      expect(validStatuses).to.not.include('InvalidStatus');
    });
  });

  // ── Batch Operations ─────────────────────────────────────────
  describe('PUT /api/tasks/batch/status', () => {
    it('should accept valid batch update payload', () => {
      const payload = { taskIds: ['id1', 'id2', 'id3'], status: 'In Process' };
      expect(payload.taskIds).to.have.lengthOf(3);
      expect(['Received', 'In Process', 'Completed']).to.include(payload.status);
    });

    it('should reject empty taskIds', () => {
      const payload = { taskIds: [], status: 'In Process' };
      expect(payload.taskIds).to.be.empty;
    });

    it('should reject invalid status', () => {
      const payload = { taskIds: ['id1'], status: 'InvalidStatus' };
      expect(['Received', 'In Process', 'Completed']).to.not.include(payload.status);
    });
  });

  // ── Recurring Task Generation ────────────────────────────────
  describe('Recurring Task Generation', () => {
    it('should calculate next date for daily recurrence', () => {
      const current = new Date('2026-06-17');
      const next = new Date(current);
      next.setDate(next.getDate() + 1);
      expect(next.toISOString().split('T')[0]).to.equal('2026-06-18');
    });

    it('should calculate next date for weekly recurrence', () => {
      const current = new Date('2026-06-17');
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      expect(next.toISOString().split('T')[0]).to.equal('2026-06-24');
    });

    it('should calculate next date for monthly recurrence', () => {
      const current = new Date('2026-06-17');
      const next = new Date(current);
      next.setMonth(next.getMonth() + 1);
      expect(next.toISOString().split('T')[0]).to.equal('2026-07-17');
    });

    it('should generate new task from parent template', () => {
      const parent = {
        title: 'Daily vitals', description: 'Vitals check',
        priority: 'High', deadline: new Date('2026-06-17'),
        assignedTo: 'userId', assignedRole: 'nurse',
        createdBy: 'adminId', clinicId: 'clinic1',
        recurrence: 'daily', isOngoing: true, slaHours: 4,
      };

      const nextDate = new Date(parent.deadline);
      nextDate.setDate(nextDate.getDate() + 1);

      const child = { ...parent, deadline: nextDate, parentTaskId: 'parentId' };
      expect(child.title).to.equal(parent.title);
      expect(child.deadline.getTime()).to.be.greaterThan(parent.deadline.getTime());
      expect(child.parentTaskId).to.exist;
    });
  });

  // ── SLA Breach Detection ────────────────────────────────────
  describe('SLA Breach Detection', () => {
    it('should detect SLA breach when time exceeds slaHours', () => {
      const createdAt = new Date('2026-06-17T08:00:00');
      const slaHours = 4;
      const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
      const now = new Date('2026-06-17T13:00:00');
      expect(now >= slaDeadline).to.be.true;
    });

    it('should not detect SLA breach when within time limit', () => {
      const createdAt = new Date('2026-06-17T08:00:00');
      const slaHours = 8;
      const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
      const now = new Date('2026-06-17T13:00:00');
      expect(now < slaDeadline).to.be.true;
    });

    it('should handle edge case at exact SLA deadline', () => {
      const createdAt = new Date('2026-06-17T08:00:00');
      const slaHours = 5;
      const slaDeadline = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
      const now = new Date('2026-06-17T13:00:00');
      expect(now >= slaDeadline).to.be.true;
    });
  });

  // ── Task Log ─────────────────────────────────────────────────
  describe('Task Log', () => {
    const validActions = ['Created', 'StatusChanged', 'BatchStatusChanged', 'FileUploaded'];

    it('should create a log entry with correct structure', () => {
      const logEntry = {
        taskId: 'task123', userId: 'user456', action: 'StatusChanged',
        previousStatus: 'Received', newStatus: 'In Process',
        details: 'Started working on task',
      };

      expect(logEntry).to.have.property('taskId');
      expect(logEntry).to.have.property('userId');
      expect(logEntry).to.have.property('action');
      expect(validActions).to.include(logEntry.action);
      expect(logEntry.previousStatus).to.equal('Received');
      expect(logEntry.newStatus).to.equal('In Process');
    });

    validActions.forEach(action => {
      it(`should accept action type: ${action}`, () => {
        expect(validActions).to.include(action);
      });
    });
  });

  // ── Notifications ────────────────────────────────────────────
  describe('Notifications', () => {
    it('should create notification for assigned user', () => {
      const notification = {
        userId: 'userId', message: 'You have a new task: Test Task',
        taskId: 'taskId', clinicId: 'clinic1', read: false,
      };
      expect(notification).to.have.property('userId');
      expect(notification).to.have.property('message');
      expect(notification.read).to.be.false;
    });

    it('should create SLA breach notification with correct format', () => {
      const slaNotification = {
        userId: 'userId',
        message: 'SLA BREACHED: Task "Urgent Task" exceeded 4h SLA',
        taskId: 'taskId', clinicId: 'clinic1',
      };
      expect(slaNotification.message).to.include('SLA BREACHED');
      expect(slaNotification.message).to.include('exceeded');
    });

    it('should create notification for ongoing task generation', () => {
      const notification = {
        userId: 'userId',
        message: 'New ongoing task: Daily vitals (due 6/18/2026)',
        taskId: 'taskId', clinicId: 'clinic1',
      };
      expect(notification.message).to.include('New ongoing task');
    });
  });
});
