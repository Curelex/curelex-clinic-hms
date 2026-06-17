import express from 'express';
import Task from '../models/Task.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import upload from '../middleware/upload.js';

export default function(io) {
  const router = express.Router();

  // Create Task (Admin only)
  router.post('/', auth, roleCheck('admin'), upload.array('files', 5), async (req, res) => {
    try {
      const { title, description, priority, deadline, assignedTo, assignedRole } = req.body;
      const task = new Task({
        title,
        description,
        priority,
        deadline,
        assignedTo: assignedTo || undefined,
        assignedRole,
        createdBy: req.user.id,
        clinicId: req.user.clinicId,
        taskFiles: req.files ? req.files.map(f => f.path) : []
      });
      await task.save();
      // Notify assigned staff
      if (assignedTo) {
        io.to(`doctor_${assignedTo}`).emit('task:new', task);
      }
      res.status(201).json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get Assigned Tasks (Staff)
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

  // Get count of pending assigned tasks
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

  // Get Created Tasks (Admin)
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

  // Get Task History (Completed)
  router.get('/history', auth, async (req, res) => {
    try {
      const tasks = await Task.find({
        status: 'Completed',
        clinicId: req.user.clinicId
      }).populate('assignedTo createdBy', 'name').sort({ updatedAt: -1 });
      res.json(tasks);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Update Task Status
  router.put('/:id/status', auth, upload.array('files', 5), async (req, res) => {
    try {
      const { status, completionNote } = req.body;
      const task = await Task.findOne({ _id: req.params.id, clinicId: req.user.clinicId });
      
      if (!task) return res.status(404).json({ message: 'Task not found' });
      
      // Authorization check
      if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'admin') {
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

      task.status = status;
      if (completionNote) task.completionNote = completionNote;
      
      if (req.files) {
        task.completionFiles = req.files.map(f => f.path);
      }

      await task.save();
      io.emit('task:updated', task);
      res.json(task);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  return router;
}
