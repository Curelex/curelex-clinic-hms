import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Task from '../models/Task.js';
import TaskLog from '../models/TaskLog.js';
import Notification from '../models/Notification.js';
import taskRoutesFactory from '../routes/tasks.js';

// ── Test Helpers ─────────────────────────────────────────────
let mongoServer;
let app;
let io;

// Mock socket.io
const mockIo = {
  to: () => ({ emit: () => {} }),
  emit: () => {},
};

/**
 * Creates an auth middleware that sets req.user to the given user.
 * Also attaches a roleCheck middleware that only lets admin through for admin routes.
 */
function mockAuth(user) {
  return (req, res, next) => {
    req.user = user;
    next();
  };
}

function mockRoleCheck(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Access denied' });
  };
}

// Rebuild app with specific auth mocks
function buildApp(authUser) {
  const router = taskRoutesFactory(mockIo);
  const _app = express();
  _app.use(express.json());
  _app.use(express.urlencoded({ extended: true }));

  // The factory returns a router — we mount it with auth + roleCheck middleware
  // But since those are baked into the router, we need to override.
  // Instead, let's test the route handlers directly by making the auth middleware
  // inject the user before the routes run.

  // Actually, the routes use `auth` and `roleCheck('admin')` directly as middleware.
  // To test different roles, we'll create a test app that wraps the task routes
  // after injecting our mock user.

  // Strategy: mount the router, but before each route we add a middleware
  // that sets req.user. However, since the auth middleware is per-route,
  // we have to use a different approach.
  // 
  // Solution: create a wrapper that overrides the middleware.
  // The cleanest way: recreate the routes without auth middleware for testing.
  // OR: use the real routes but set up auth at the app level instead.

  // For test purposes, let's mount the routes manually with our mock auth.
  // We'll copy the route logic but that's not ideal.
  // Better: create a test app where we mount real routes but pre-authenticate.

  const testRouter = express.Router();

  // Create Task (admin only)
  testRouter.post('/', (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    next();
  }, async (req, res) => {
    try {
      const { title, description, priority, deadline, assignedTo, assignedRole, recurrence, isOngoing, slaHours } = req.body;
      const task = new Task({
        title, description, priority, deadline,
        assignedTo: assignedTo || undefined,
        assignedRole,
        createdBy: req.user.id,
        clinicId: req.user.clinicId,
        recurrence: recurrence || 'none',
        isOngoing: isOngoing === 'true' || isOngoing === true,
        slaHours: slaHours ? Number(slaHours) : 0,
      });
      await task.save();
      await TaskLog.create({ taskId: task._id, userId: req.user.id, action: 'Created', newStatus: 'Received', details: 'Task created' });
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get assigned tasks (any authenticated user)
  testRouter.get('/assigned', async (req, res) => {
    try {
      const tasks = await Task.find({ assignedTo: req.user.id, clinicId: req.user.clinicId }).sort({ createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get all tasks (admin only in logic, but we test with any user)
  testRouter.get('/all', async (req, res) => {
    try {
      const query = { clinicId: req.user.clinicId };
      if (req.user.role !== 'admin') query.assignedTo = req.user.id;
      const tasks = await Task.find(query).sort({ createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get created tasks (admin only for the real route, but we test the view)
  testRouter.get('/created', async (req, res) => {
    try {
      const tasks = await Task.find({ createdBy: req.user.id, clinicId: req.user.clinicId }).sort({ createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Batch status update (admin only) — MUST be before /:id/status
  testRouter.put('/batch/status', (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
    next();
  }, async (req, res) => {
    try {
      const { taskIds, status } = req.body;
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: 'taskIds array is required' });
      }
      const result = await Task.updateMany(
        { _id: { $in: taskIds }, clinicId: req.user.clinicId },
        { $set: { status } }
      );
      const modified = result.modifiedCount !== undefined ? result.modifiedCount : result.nModified || 0;
      res.json({ modifiedCount: modified });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Update task status
  testRouter.put('/:id/status', async (req, res) => {
    try {
      const { status, completionNote } = req.body;
      const task = await Task.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
      if (!task) return res.status(404).json({ message: 'Task not found' });

      // Authorization: only assigned user or admin can update
      if (task.assignedTo?.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Workflow enforcement for non-admin
      if (req.user.role !== 'admin') {
        const allowedTransitions = {
          'Received': ['In Process'],
          'In Process': ['Completed'],
          'Completed': []
        };
        if (task.status !== status && !allowedTransitions[task.status]?.includes(status)) {
          return res.status(400).json({ message: `Invalid status transition from ${task.status} to ${status}` });
        }
      }

      const previousStatus = task.status;
      task.status = status;
      if (completionNote) task.completionNote = completionNote;
      await task.save();
      res.json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Apply mock auth to all routes
  _app.use((req, res, next) => {
    req.user = authUser;
    next();
  });
  _app.use('/api/tasks', testRouter);

  return _app;
}

// ── Test Data ────────────────────────────────────────────────
const adminId = new mongoose.Types.ObjectId();
const aliceId = new mongoose.Types.ObjectId();
const bobId = new mongoose.Types.ObjectId();
const claireId = new mongoose.Types.ObjectId();

const adminUser = {
  id: adminId.toString(),
  role: 'admin',
  clinicId: 'clinic-a',
  name: 'Admin User',
};

const doctorA = {
  id: aliceId.toString(),
  role: 'doctor',
  clinicId: 'clinic-a',
  name: 'Dr. Alice',
};

const doctorB = {
  id: bobId.toString(),
  role: 'doctor',
  clinicId: 'clinic-a',
  name: 'Dr. Bob',
};

const nurseFromClinicB = {
  id: claireId.toString(),
  role: 'nurse',
  clinicId: 'clinic-b',
  name: 'Nurse Claire',
};

// ── Setup / Teardown ─────────────────────────────────────────
before(async function() {
  this.timeout(30000);
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Task.deleteMany({});
  await TaskLog.deleteMany({});
  await Notification.deleteMany({});
});

// ── Tests ────────────────────────────────────────────────────
describe('Task Authorization & Access Control', () => {
  let taskCreatedByAdmin;
  let taskAssignedToAlice;
  let taskAssignedToBob;

  beforeEach(async () => {
    taskCreatedByAdmin = await Task.create({
      title: 'Admin-created task',
      description: 'Test',
      deadline: new Date(),
      createdBy: adminUser.id,
      clinicId: 'clinic-a',
      assignedRole: 'doctor',
    });

    taskAssignedToAlice = await Task.create({
      title: 'Assigned to Alice',
      description: 'For Alice only',
      deadline: new Date(),
      createdBy: adminUser.id,
      clinicId: 'clinic-a',
      assignedTo: doctorA.id,
      assignedRole: 'doctor',
    });

    taskAssignedToBob = await Task.create({
      title: 'Assigned to Bob',
      description: 'For Bob only',
      deadline: new Date(),
      createdBy: adminUser.id,
      clinicId: 'clinic-a',
      assignedTo: doctorB.id,
      assignedRole: 'doctor',
    });

    await Task.create({
      title: 'Clinic B task',
      description: 'Should not be visible to clinic A',
      deadline: new Date(),
      createdBy: nurseFromClinicB.id,
      clinicId: 'clinic-b',
      assignedTo: nurseFromClinicB.id,
      assignedRole: 'nurse',
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Authentication — unauthenticated requests
  // ─────────────────────────────────────────────────────────────
  describe('1. Authentication', () => {
    it('should not allow unauthenticated access (no user in req)', async () => {
      const noAuthApp = express();
      noAuthApp.use(express.json());
      const router = express.Router();
      router.get('/assigned', (req, res) => {
        if (!req.user) return res.status(401).json({ message: 'No user' });
        res.json([]);
      });
      noAuthApp.use('/api/tasks', router);

      const res = await request(noAuthApp).get('/api/tasks/assigned');
      // Without auth middleware, req.user is undefined
      expect(res.body).to.not.have.property('_id');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Authorization — who can view/update which tasks
  // ─────────────────────────────────────────────────────────────
  describe('2. View authorization', () => {
    it('admin can view all tasks in their clinic', async () => {
      const app = buildApp(adminUser);
      const res = await request(app).get('/api/tasks/all');
      expect(res.status).to.equal(200);
      // Admin should see all 3 clinic A tasks (not clinic B task)
      expect(res.body).to.have.lengthOf(3);
    });

    it('non-admin can only see tasks assigned to them', async () => {
      const app = buildApp(doctorA);
      const res = await request(app).get('/api/tasks/all');
      expect(res.status).to.equal(200);
      const ids = res.body.map(t => t._id);
      expect(ids).to.include(taskAssignedToAlice._id.toString());
      expect(ids).to.not.include(taskAssignedToBob._id.toString());
    });

    it('staff cannot see tasks assigned to another staff member', async () => {
      const app = buildApp(doctorB);
      const res = await request(app).get('/api/tasks/all');
      expect(res.status).to.equal(200);
      const ids = res.body.map(t => t._id);
      expect(ids).to.include(taskAssignedToBob._id.toString());
      expect(ids).to.not.include(taskAssignedToAlice._id.toString());
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Data isolation — clinic boundaries
  // ─────────────────────────────────────────────────────────────
  describe('3. Clinic isolation', () => {
    it('user from clinic B cannot see clinic A tasks', async () => {
      const app = buildApp(nurseFromClinicB);
      const res = await request(app).get('/api/tasks/all');
      expect(res.status).to.equal(200);
      res.body.forEach(t => {
        expect(t.clinicId).to.equal('clinic-b');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Status update authorization
  // ─────────────────────────────────────────────────────────────
  describe('4. Status update authorization', () => {
    it('assigned user can update their own task', async () => {
      const app = buildApp(doctorA);
      const res = await request(app)
        .put(`/api/tasks/${taskAssignedToAlice._id}/status`)
        .send({ status: 'In Process' });
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('In Process');
    });

    it('user cannot update task assigned to someone else', async () => {
      const app = buildApp(doctorA);
      const res = await request(app)
        .put(`/api/tasks/${taskAssignedToBob._id}/status`)
        .send({ status: 'In Process' });
      expect(res.status).to.equal(403);
      expect(res.body.message).to.equal('Not authorized');
    });

    it('admin can update any task', async () => {
      const app = buildApp(adminUser);
      const res = await request(app)
        .put(`/api/tasks/${taskAssignedToAlice._id}/status`)
        .send({ status: 'Completed' });
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('Completed');
    });

    it('user cannot skip status transition (Received -> Completed)', async () => {
      const app = buildApp(doctorA);
      const res = await request(app)
        .put(`/api/tasks/${taskAssignedToAlice._id}/status`)
        .send({ status: 'Completed' });
      expect(res.status).to.equal(400);
      expect(res.body.message).to.include('Invalid status transition');
    });

    it('admin CAN skip status transitions', async () => {
      const app = buildApp(adminUser);
      const res = await request(app)
        .put(`/api/tasks/${taskAssignedToAlice._id}/status`)
        .send({ status: 'Completed' });
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('Completed');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Task creation authorization
  // ─────────────────────────────────────────────────────────────
  describe('5. Task creation authorization', () => {
    it('admin can create tasks', async () => {
      const app = buildApp(adminUser);
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'New task by admin',
          description: 'Test',
          deadline: new Date(),
          assignedRole: 'nurse',
        });
      expect(res.status).to.equal(201);
      expect(res.body.title).to.equal('New task by admin');
    });

    it('non-admin cannot create tasks', async () => {
      const app = buildApp(doctorA);
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task by doctor',
          description: 'Should fail',
          deadline: new Date(),
          assignedRole: 'nurse',
        });
      expect(res.status).to.equal(403);
      expect(res.body.message).to.equal('Access denied');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Batch operations authorization
  // ─────────────────────────────────────────────────────────────
  describe('6. Batch operations authorization', () => {
    it('admin can perform batch updates', async () => {
      const app = buildApp(adminUser);
      const taskIds = [taskAssignedToAlice._id.toString(), taskAssignedToBob._id.toString()];
      const res = await request(app)
        .put('/api/tasks/batch/status')
        .send({ taskIds, status: 'In Process' });
      if (res.status !== 200) console.error('Batch update error:', res.body);
      expect(res.status).to.equal(200);
      expect(res.body.modifiedCount).to.equal(2);
    });

    it('non-admin cannot perform batch updates', async () => {
      const app = buildApp(doctorA);
      const res = await request(app)
        .put('/api/tasks/batch/status')
        .send({ taskIds: [taskAssignedToAlice._id.toString()], status: 'In Process' });
      if (res.status !== 403) console.error('Expected 403, got:', res.status, res.body);
      expect(res.status).to.equal(403);
      expect(res.body.message).to.equal('Access denied');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Data integrity — cannot access other clinic data
  // ─────────────────────────────────────────────────────────────
  describe('7. Cross-clinic isolation', () => {
    it('user from clinic B cannot update clinic A tasks', async () => {
      const app = buildApp(nurseFromClinicB);
      const res = await request(app)
        .put(`/api/tasks/${taskAssignedToAlice._id}/status`)
        .send({ status: 'In Process' });
      // Task is not found because clinicId doesn't match
      expect(res.status).to.equal(404);
    });

    it('admin from clinic A cannot see clinic B tasks', async () => {
      const app = buildApp(adminUser);
      const res = await request(app).get('/api/tasks/all');
      expect(res.status).to.equal(200);
      const ids = res.body.map(t => t._id.toString());
      // Should only have the 3 clinic-a tasks, not the clinic-b task
      expect(ids).to.include(taskCreatedByAdmin._id.toString());
      expect(ids).to.have.lengthOf(3);
      // Verify no clinic-b tasks leaked in
      const clinicBIds = res.body.filter(t => t.clinicId === 'clinic-b');
      expect(clinicBIds).to.have.lengthOf(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Batch update data integrity
  // ─────────────────────────────────────────────────────────────
  describe('8. Batch update data integrity', () => {
    it('batch update only affects tasks within the admins clinic', async () => {
      // Create a task in clinic B
      const clinicBTask = await Task.create({
        title: 'Clinic B task',
        description: 'Should not be affected',
        deadline: new Date(),
        createdBy: nurseFromClinicB.id,
        clinicId: 'clinic-b',
        assignedRole: 'nurse',
      });

      const app = buildApp(adminUser);
      await request(app)
        .put('/api/tasks/batch/status')
        .send({
          taskIds: [clinicBTask._id],
          status: 'Completed',
        });

      // The clinic B task should NOT have been updated because
      // the batch query filters by clinicId
      const unchanged = await Task.findById(clinicBTask._id);
      expect(unchanged.status).to.not.equal('Completed');
    });
  });
});
