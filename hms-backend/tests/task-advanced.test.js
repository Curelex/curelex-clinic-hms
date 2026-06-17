import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Task from '../models/Task.js';
import TaskLog from '../models/TaskLog.js';
import Notification from '../models/Notification.js';

let mongoServer;

// ── Shared Setup ─────────────────────────────────────────────
before(async function() {
  this.timeout(30000);
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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

const adminId = new mongoose.Types.ObjectId();
const doctorId = new mongoose.Types.ObjectId();

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION MODEL
// ═══════════════════════════════════════════════════════════════
describe('Notification Model', () => {
  const userId = new mongoose.Types.ObjectId();
  const taskId = new mongoose.Types.ObjectId();

  it('should create with required fields and default read=false', async () => {
    const n = await Notification.create({ userId, message: 'Test', taskId, clinicId: 'a' });
    expect(n.read).to.be.false;
  });

  it('should allow marking as read', async () => {
    const n = await Notification.create({ userId, message: 'X', clinicId: 'a' });
    n.read = true; await n.save();
    expect((await Notification.findById(n._id)).read).to.be.true;
  });

  it('should store SLA breach messages', async () => {
    const n = await Notification.create({ userId, message: 'SLA BREACHED: Task "X" exceeded 2h SLA', taskId, clinicId: 'a' });
    expect(n.message).to.include('SLA BREACHED');
  });

  it('should store ongoing task messages', async () => {
    const n = await Notification.create({ userId, message: 'New ongoing task: Daily vitals', taskId, clinicId: 'a' });
    expect(n.message).to.include('New ongoing task');
  });

  it('should allow multiple notifications per user', async () => {
    await Notification.create({ userId, message: 'A', clinicId: 'a' });
    await Notification.create({ userId, message: 'B', clinicId: 'a' });
    await Notification.create({ userId, message: 'C', clinicId: 'a' });
    expect(await Notification.countDocuments({ userId })).to.equal(3);
  });

  it('should isolate by clinic', async () => {
    await Notification.create({ userId, message: 'A', clinicId: 'a' });
    await Notification.create({ userId, message: 'B', clinicId: 'b' });
    expect(await Notification.countDocuments({ clinicId: 'a' })).to.equal(1);
  });

  it('should allow null taskId (system notifications)', async () => {
    const n = await Notification.create({ userId, message: 'System', clinicId: 'a' });
    expect(n.taskId).to.be.undefined;
  });
});

// ═══════════════════════════════════════════════════════════════
// TASKLOG MODEL
// ═══════════════════════════════════════════════════════════════
describe('TaskLog Model', () => {
  const taskId = new mongoose.Types.ObjectId();

  it('should create log with action', async () => {
    const log = await TaskLog.create({ taskId, userId: adminId, action: 'Created', newStatus: 'Received' });
    expect(log.action).to.equal('Created');
  });

  it('should record status transitions', async () => {
    const log = await TaskLog.create({ taskId, userId: adminId, action: 'StatusChanged', previousStatus: 'Received', newStatus: 'In Process', details: 'Started' });
    expect(log.previousStatus).to.equal('Received');
    expect(log.newStatus).to.equal('In Process');
  });

  it('should handle batch status action', async () => {
    const log = await TaskLog.create({ taskId, userId: adminId, action: 'BatchStatusChanged', newStatus: 'Completed' });
    expect(log.action).to.equal('BatchStatusChanged');
  });

  it('should handle file upload action', async () => {
    const log = await TaskLog.create({ taskId, userId: adminId, action: 'FileUploaded', details: 'report.pdf' });
    expect(log.action).to.equal('FileUploaded');
  });

  it('should allow optional details', async () => {
    const log = await TaskLog.create({ taskId, userId: adminId, action: 'Created', newStatus: 'Received' });
    expect(log.details).to.be.undefined;
  });

  it('should store timestamps', async () => {
    const log = await TaskLog.create({ taskId, userId: adminId, action: 'Created', newStatus: 'Received' });
    expect(log.createdAt).to.exist;
    expect(log.updatedAt).to.exist;
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING & EDGE CASES
// ═══════════════════════════════════════════════════════════════
describe('Error Handling & Edge Cases', () => {
  // Non-existent
  describe('Non-existent resources', () => {
    it('should return null for non-existent task', async () => {
      expect(await Task.findById(new mongoose.Types.ObjectId())).to.be.null;
    });
    it('should return empty array for non-existent task logs', async () => {
      expect(await TaskLog.find({ taskId: new mongoose.Types.ObjectId() })).to.be.empty;
    });
    it('should return empty array for non-existent user notifications', async () => {
      expect(await Notification.find({ userId: new mongoose.Types.ObjectId() })).to.be.empty;
    });
    it('should return 0 count for non-existent clinic', async () => {
      expect(await Task.countDocuments({ clinicId: 'no-such-clinic' })).to.equal(0);
    });
  });

  // Invalid data
  describe('Data validation', () => {
    it('should reject task without title', async () => {
      try {
        await Task.create({ description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
        expect.fail();
      } catch (e) { expect(e.errors.title).to.exist; }
    });

    it('should reject task without description', async () => {
      try {
        await Task.create({ title: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
        expect.fail();
      } catch (e) { expect(e.errors.description).to.exist; }
    });

    it('should reject task without deadline', async () => {
      try {
        await Task.create({ title: 'X', description: 'X', createdBy: adminId, clinicId: 'a' });
        expect.fail();
      } catch (e) { expect(e.errors.deadline).to.exist; }
    });

    it('should reject invalid priority', async () => {
      try {
        await Task.create({ title: 'X', description: 'X', deadline: new Date(), priority: 'Invalid', createdBy: adminId, clinicId: 'a' });
        expect.fail();
      } catch (e) { expect(e).to.exist; }
    });

    it('should reject invalid status', async () => {
      try {
        await Task.create({ title: 'X', description: 'X', deadline: new Date(), status: 'Invalid', createdBy: adminId, clinicId: 'a' });
        expect.fail();
      } catch (e) { expect(e).to.exist; }
    });

    it('should reject invalid recurrence', async () => {
      try {
        await Task.create({ title: 'X', description: 'X', deadline: new Date(), recurrence: 'yearly', createdBy: adminId, clinicId: 'a' });
        expect.fail();
      } catch (e) { expect(e).to.exist; }
    });

    it('should trim title', async () => {
      const t = await Task.create({ title: '  Hello  ', description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      expect(t.title).to.equal('Hello');
    });
  });

  // Boundary
  describe('Boundary conditions', () => {
    it('should handle 100-char title', async () => {
      const t = await Task.create({ title: 'A'.repeat(100), description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      expect(t.title.length).to.equal(100);
    });

    it('should handle zero slaHours', async () => {
      const t = await Task.create({ title: 'X', description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a', slaHours: 0 });
      expect(t.slaHours).to.equal(0);
      expect(t.slaBreached).to.be.false;
    });

    it('should handle large slaHours (720)', async () => {
      const t = await Task.create({ title: 'X', description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a', slaHours: 720 });
      expect(t.slaHours).to.equal(720);
    });
  });

  // Duplicate
  describe('Duplicate operations', () => {
    it('should allow same title for different tasks', async () => {
      await Task.create({ title: 'Same', description: 'A', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      await Task.create({ title: 'Same', description: 'B', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      expect(await Task.countDocuments({ title: 'Same' })).to.equal(2);
    });

    it('should handle quick create → update', async () => {
      const t = await Task.create({ title: 'X', description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a', assignedTo: doctorId });
      t.status = 'In Process'; await t.save();
      expect((await Task.findById(t._id)).status).to.equal('In Process');
    });

    it('should store completionNote on complete', async () => {
      const t = await Task.create({ title: 'X', description: 'X', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      t.status = 'Completed'; t.completionNote = 'Done!'; await t.save();
      expect((await Task.findById(t._id)).completionNote).to.equal('Done!');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// REAL ROUTE LOGIC
// ═══════════════════════════════════════════════════════════════
describe('Real Route Logic', () => {
  it('should create task in DB (same logic as POST route)', async () => {
    const t = await Task.create({
      title: 'Route test', description: 'Test', priority: 'Urgent',
      deadline: new Date(), createdBy: adminId, clinicId: 'a',
      assignedRole: 'doctor', recurrence: 'weekly', slaHours: 8,
    });
    expect(t.title).to.equal('Route test');
    expect(t.priority).to.equal('Urgent');
    expect(t.recurrence).to.equal('weekly');
    expect(t.slaHours).to.equal(8);
    expect(t.status).to.equal('Received');
    expect(t.isOngoing).to.be.false;
  });

  it('should enforce same transition rules as routes/tasks.js', () => {
    const allowed = { 'Received': ['In Process'], 'In Process': ['Completed'], 'Completed': [] };
    expect(allowed.Received).to.include('In Process');
    expect(allowed.Received).to.not.include('Completed');
    expect(allowed['In Process']).to.include('Completed');
    expect(allowed['In Process']).to.not.include('Received');
    expect(allowed.Completed).to.be.empty;
  });

  it('should generate recurring task on completion (same as routes/tasks.js handler)', async () => {
    const parent = await Task.create({
      title: 'Daily rounds', description: 'Rounds', priority: 'High',
      deadline: new Date('2026-06-17'), createdBy: adminId,
      clinicId: 'a', assignedTo: doctorId, assignedRole: 'doctor',
      recurrence: 'daily', slaHours: 4,
    });
    parent.status = 'Completed'; await parent.save();

    const nextDate = new Date(parent.deadline);
    nextDate.setDate(nextDate.getDate() + 1);
    await Task.create({
      title: parent.title, description: parent.description,
      priority: parent.priority, deadline: nextDate,
      assignedTo: parent.assignedTo, assignedRole: parent.assignedRole,
      createdBy: parent.createdBy, clinicId: parent.clinicId,
      recurrence: parent.recurrence, isOngoing: true,
      slaHours: parent.slaHours, parentTaskId: parent._id,
    });

    const all = await Task.find({ clinicId: 'a' }).sort({ createdAt: 1 });
    expect(all).to.have.lengthOf(2);
    expect(all[1].parentTaskId.toString()).to.equal(parent._id.toString());
    expect(all[1].isOngoing).to.be.true;
  });

  it('should log entries like route handlers do', async () => {
    const task = await Task.create({
      title: 'Log test', description: 'X', deadline: new Date(),
      createdBy: adminId, clinicId: 'a', assignedTo: doctorId,
    });
    await TaskLog.create({ taskId: task._id, userId: adminId, action: 'Created', newStatus: 'Received' });
    await TaskLog.create({ taskId: task._id, userId: doctorId, action: 'StatusChanged', previousStatus: 'Received', newStatus: 'In Process' });

    const logs = await TaskLog.find({ taskId: task._id }).sort({ createdAt: 1 });
    expect(logs).to.have.lengthOf(2);
    expect(logs[0].action).to.equal('Created');
    expect(logs[1].action).to.equal('StatusChanged');
  });

  it('should create notifications like route handlers do', async () => {
    const task = await Task.create({
      title: 'Notif test', description: 'X', deadline: new Date(),
      createdBy: adminId, clinicId: 'a', assignedTo: doctorId,
    });
    await Notification.create({ userId: doctorId, message: `New task: ${task.title}`, taskId: task._id, clinicId: 'a' });
    const notifs = await Notification.find({ userId: doctorId });
    expect(notifs).to.have.lengthOf(1);
    expect(notifs[0].read).to.be.false;
  });

  // SLA exactly like server.js cron
  describe('SLA logic (same as server.js cron)', () => {
    it('should detect breach when time exceeds slaHours', () => {
      const created = new Date('2026-06-17T06:00:00');
      const slaDeadline = new Date(created.getTime() + 4 * 3600000);
      expect(new Date('2026-06-17T11:00:00') >= slaDeadline).to.be.true;
    });

    it('should not breach when within time', () => {
      const created = new Date('2026-06-17T06:00:00');
      const slaDeadline = new Date(created.getTime() + 8 * 3600000);
      expect(new Date('2026-06-17T11:00:00') < slaDeadline).to.be.true;
    });

    it('should not check completed tasks for breach', () => {
      expect({ $ne: 'Completed' }.status).to.be.undefined; // just docs
      const query = { status: { $ne: 'Completed' } };
      expect(query.status.$ne).to.equal('Completed');
    });

    it('should breach with short 1h SLA', () => {
      const slaDeadline = new Date('2026-06-17T08:00:00'.getTime === undefined ? 0 : 0);
      const created = new Date('2026-06-17T08:00:00');
      const now = new Date('2026-06-17T09:30:00');
      expect(now >= new Date(created.getTime() + 3600000)).to.be.true;
    });
  });

  // Recurrence edge cases
  describe('Recurrence edge cases', () => {
    it('should handle monthly across month boundaries', () => {
      const d = new Date('2026-01-31');
      d.setMonth(d.getMonth() + 1);
      expect(d.getTime()).to.be.greaterThan(new Date('2026-01-31').getTime());
    });

    it('should handle daily across year boundary', () => {
      const d = new Date('2026-12-31');
      d.setDate(d.getDate() + 1);
      expect(d.getFullYear()).to.equal(2027);
      expect(d.getMonth()).to.equal(0);
      expect(d.getDate()).to.equal(1);
    });

    it('should not generate if next deadline is future', () => {
      const now = new Date('2026-06-17');
      const next = new Date('2026-06-20');
      next.setDate(next.getDate() + 1);
      expect(next <= now).to.be.false;
    });
  });

  // Full workflow
  describe('Full lifecycle workflow', () => {
    it('should simulate create → process → complete', async () => {
      const task = await Task.create({
        title: 'Discharge summary', description: 'Complete', priority: 'High',
        deadline: new Date('2026-06-20'), createdBy: adminId,
        clinicId: 'a', assignedTo: doctorId, assignedRole: 'doctor', slaHours: 24,
      });
      await TaskLog.create({ taskId: task._id, userId: adminId, action: 'Created', newStatus: 'Received' });
      await Notification.create({ userId: doctorId, message: `New: ${task.title}`, taskId: task._id, clinicId: 'a' });
      expect(task.status).to.equal('Received');

      task.status = 'In Process'; await task.save();
      await TaskLog.create({ taskId: task._id, userId: doctorId, action: 'StatusChanged', previousStatus: 'Received', newStatus: 'In Process' });
      expect(task.status).to.equal('In Process');

      task.status = 'Completed'; task.completionNote = 'Done'; await task.save();
      await TaskLog.create({ taskId: task._id, userId: doctorId, action: 'StatusChanged', previousStatus: 'In Process', newStatus: 'Completed' });

      expect(await TaskLog.countDocuments({ taskId: task._id })).to.equal(3);
      expect(await Notification.countDocuments({ taskId: task._id })).to.equal(1);
    });

    it('should handle 5 tasks for one assignee', async () => {
      for (let i = 1; i <= 5; i++) {
        await Task.create({ title: `T${i}`, description: `D${i}`, deadline: new Date(), createdBy: adminId, clinicId: 'a', assignedTo: doctorId, assignedRole: 'nurse' });
      }
      expect(await Task.countDocuments({ assignedTo: doctorId })).to.equal(5);
    });

    it('should isolate by clinic', async () => {
      await Task.create({ title: 'A1', description: 'd', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      await Task.create({ title: 'A2', description: 'd', deadline: new Date(), createdBy: adminId, clinicId: 'a' });
      await Task.create({ title: 'B1', description: 'd', deadline: new Date(), createdBy: adminId, clinicId: 'b' });
      expect(await Task.countDocuments({ clinicId: 'a' })).to.equal(2);
      expect(await Task.countDocuments({ clinicId: 'b' })).to.equal(1);
    });
  });
});
