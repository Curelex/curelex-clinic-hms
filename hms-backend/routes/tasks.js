import express from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import TaskLog from '../models/TaskLog.js';
import Notification from '../models/Notification.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import upload from '../middleware/upload.js';

export default function(io) {
  const router = express.Router();

  const logAction = async (taskId, userId, action, previousStatus, newStatus, details) => {
    await TaskLog.create({ taskId, userId, action, previousStatus, newStatus, details });
  };

  const createNotification = async (userId, message, taskId, clinicId) => {
    await Notification.create({ userId, message, taskId, clinicId });
  };

  // ── Dashboard Stats ───────────────────────────────────────────
  router.get('/stats', auth, async (req, res) => {
    try {
      const { clinicId } = req.user;
      const match = { clinicId };

      const total = await Task.countDocuments(match);
      const completed = await Task.countDocuments({ ...match, status: 'Completed' });
      const pending = await Task.countDocuments({ ...match, status: 'Received' });
      const inProgress = await Task.countDocuments({ ...match, status: 'In Process' });
      const overdue = await Task.countDocuments({ ...match, deadline: { $lt: new Date() }, status: { $ne: 'Completed' } });
      const slaBreached = await Task.countDocuments({ ...match, slaBreached: true });

      // Average resolution time (completed tasks)
      const completedTasks = await Task.find({ ...match, status: 'Completed' }).select('createdAt updatedAt').lean();
      let avgResolutionMs = 0;
      if (completedTasks.length > 0) {
        const totalMs = completedTasks.reduce((sum, t) => sum + (new Date(t.updatedAt) - new Date(t.createdAt)), 0);
        avgResolutionMs = totalMs / completedTasks.length;
      }

      // Tasks per priority
      const byPriority = await Task.aggregate([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]);

      // Tasks per day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const byDay = await Task.aggregate([
        { $match: { ...match, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        total,
        completed,
        pending,
        inProgress,
        overdue,
        slaBreached,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgResolutionHours: avgResolutionMs > 0 ? Math.round(avgResolutionMs / (1000 * 60 * 60) * 10) / 10 : 0,
        byPriority: byPriority.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
        byDay,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Create Task (Admin only) ──────────────────────────────────
  router.post('/', auth, roleCheck('admin'), upload.array('files', 5), async (req, res) => {
    try {
      const { title, description, priority, deadline, assignedTo, assignedRole, recurrence, isOngoing, slaHours } = req.body;
      const task = new Task({
        title, description, priority, deadline,
        assignedTo: assignedTo || undefined,
        assignedRole,
        createdBy: req.user.id,
        clinicId: req.user.clinicId,
        taskFiles: req.files ? req.files.map(f => f.path) : [],
        recurrence: recurrence || 'none',
        isOngoing: isOngoing === 'true' || isOngoing === true,
        slaHours: slaHours ? Number(slaHours) : 0,
      });
      await task.save();
      await logAction(task._id, req.user.id, 'Created', null, 'Received', 'Task created');

      if (assignedTo) {
        await createNotification(assignedTo, `You have a new task: ${title}`, task._id, req.user.clinicId);
        io.to(`doctor_${assignedTo}`).emit('task:new', task);
      }
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get All Tasks (Admin) ─────────────────────────────────────
  router.get('/', auth, async (req, res) => {
    try {
      const { priority, status, search, ongoing } = req.query;
      const query = { clinicId: req.user.clinicId };
      if (req.user.role !== 'admin') query.assignedTo = req.user.id;
      if (priority) query.priority = priority;
      if (status) query.status = status;
      if (search) query.title = { $regex: search, $options: 'i' };
      if (ongoing === 'true') query.isOngoing = true;

      const tasks = await Task.find(query)
        .populate('assignedTo createdBy', 'name')
        .sort({ createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get Assigned Tasks (Staff) ────────────────────────────────
  router.get('/assigned', auth, async (req, res) => {
    try {
      const tasks = await Task.find({ assignedTo: req.user.id, clinicId: req.user.clinicId })
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get count of pending assigned tasks ───────────────────────
  router.get('/count', auth, async (req, res) => {
    try {
      const count = await Task.countDocuments({
        assignedTo: req.user.id,
        clinicId: req.user.clinicId,
        status: { $ne: 'Completed' }
      });
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get Created Tasks (Admin) ─────────────────────────────────
  router.get('/created', auth, roleCheck('admin'), async (req, res) => {
    try {
      const tasks = await Task.find({ createdBy: req.user.id, clinicId: req.user.clinicId })
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get Task History (Completed) ──────────────────────────────
  router.get('/history', auth, async (req, res) => {
    try {
      const { search, priority } = req.query;
      const query = { status: 'Completed', clinicId: req.user.clinicId };
      if (search) query.title = { $regex: search, $options: 'i' };
      if (priority) query.priority = priority;

      const tasks = await Task.find(query)
        .populate('assignedTo createdBy', 'name')
        .sort({ updatedAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get Notifications ─────────────────────────────────────────
  router.get('/notifications', auth, async (req, res) => {
    try {
      const notifications = await Notification.find({ userId: req.user.id, clinicId: req.user.clinicId }).sort({ createdAt: -1 });
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Mark notification as read ─────────────────────────────────
  router.put('/notifications/:id/read', auth, async (req, res) => {
    try {
      await Notification.findByIdAndUpdate(req.params.id, { read: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Get Task Logs ─────────────────────────────────────────────
  router.get('/:id/logs', auth, async (req, res) => {
    try {
      const logs = await TaskLog.find({ taskId: req.params.id })
        .populate('userId', 'name')
        .sort({ createdAt: -1 });
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Update Task Status ────────────────────────────────────────
  router.put('/:id/status', auth, upload.array('files', 5), async (req, res) => {
    try {
      const { status, completionNote } = req.body;
      const task = await Task.findOne({ _id: req.params.id, clinicId: req.user.clinicId });

      if (!task) return res.status(404).json({ message: 'Task not found' });

      if (task.assignedTo?.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

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

      if (req.files) {
        task.completionFiles = req.files.map(f => f.path);
      }

      await task.save();
      await logAction(task._id, req.user.id, 'StatusChanged', previousStatus, status, completionNote);
      await createNotification(task.createdBy, `Task ${task.title} status changed to ${status}`, task._id, req.user.clinicId);

      // If completed and recurring, generate next instance
      if (status === 'Completed' && task.recurrence && task.recurrence !== 'none') {
        const nextDate = new Date(task.deadline);
        switch (task.recurrence) {
          case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        }
        const newTask = new Task({
          title: task.title,
          description: task.description,
          priority: task.priority,
          deadline: nextDate,
          assignedTo: task.assignedTo,
          assignedRole: task.assignedRole,
          createdBy: task.createdBy,
          clinicId: task.clinicId,
          recurrence: task.recurrence,
          isOngoing: true,
          slaHours: task.slaHours,
          parentTaskId: task.parentTaskId || task._id,
        });
        await newTask.save();
        if (newTask.assignedTo) {
          await createNotification(newTask.assignedTo, `New recurring task: ${newTask.title} (due ${nextDate.toLocaleDateString()})`, newTask._id, req.user.clinicId);
        }
      }

      io.emit('task:updated', task);
      res.json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Batch Status Update ───────────────────────────────────────
  router.put('/batch/status', auth, roleCheck('admin'), async (req, res) => {
    try {
      const { taskIds, status } = req.body;
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: 'taskIds array is required' });
      }
      const validStatuses = ['Received', 'In Process', 'Completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status: ${status}` });
      }

      const result = await Task.updateMany(
        { _id: { $in: taskIds }, clinicId: req.user.clinicId },
        { $set: { status } }
      );

      for (const id of taskIds) {
        await logAction(id, req.user.id, 'BatchStatusChanged', null, status, 'Batch update');
      }

      // Notify affected users
      const affectedTasks = await Task.find({ _id: { $in: taskIds } }).populate('assignedTo', 'name');
      for (const task of affectedTasks) {
        if (task.assignedTo) {
          await createNotification(task.assignedTo._id, `Task "${task.title}" status changed to ${status} (batch)`, task._id, req.user.clinicId);
        }
      }

      io.emit('task:updated', { batch: true, taskIds, status });
      res.json({ modifiedCount: result.modifiedCount });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Generate Ongoing Tasks (manual trigger) ───────────────────
  router.post('/generate-ongoing', auth, async (req, res) => {
    try {
      const now = new Date();
      const ongoingTasks = await Task.find({
        clinicId: req.user.clinicId,
        isOngoing: true,
        status: 'Completed',
        $or: [
          { lastGenerated: { $exists: false } },
          { lastGenerated: null },
        ],
      });

      let generated = 0;
      for (const parent of ongoingTasks) {
        const nextDate = new Date(parent.deadline);
        switch (parent.recurrence) {
          case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
          case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
          case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        }

        if (nextDate <= now) {
          const newTask = new Task({
            title: parent.title,
            description: parent.description,
            priority: parent.priority,
            deadline: nextDate,
            assignedTo: parent.assignedTo,
            assignedRole: parent.assignedRole,
            createdBy: parent.createdBy,
            clinicId: parent.clinicId,
            recurrence: parent.recurrence,
            isOngoing: true,
            slaHours: parent.slaHours,
            parentTaskId: parent.parentTaskId || parent._id,
          });
          await newTask.save();
          parent.lastGenerated = now;
          await parent.save();
          generated++;
        }
      }

      res.json({ generated });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  return router;
}
