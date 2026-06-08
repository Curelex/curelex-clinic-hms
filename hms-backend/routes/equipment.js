// hms-backend/routes/equipment.js
const router = require('express').Router();
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

// ── GET all equipment items ──
router.get('/', auth, async (req, res) => {
  try {
    const { search, condition, assignedTo, page = 1, limit = 20 } = req.query;
    let query = { category: 'Equipment' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'equipmentDetails.serialNumber': { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } }
      ];
    }
    if (condition) query['equipmentDetails.condition'] = condition;
    if (assignedTo) query['equipmentDetails.assignedTo'] = { $regex: assignedTo, $options: 'i' };
    
    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate('vendor', 'name contactPerson phone')
      .sort({ 'equipmentDetails.nextMaintenanceDate': 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    res.json({ items, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET equipment due for maintenance ──
router.get('/due-maintenance', auth, async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const items = await Inventory.find({
      category: 'Equipment',
      status: 'Active',
      'equipmentDetails.nextMaintenanceDate': { $lte: nextWeek }
    }).populate('vendor', 'name contactPerson phone')
      .sort({ 'equipmentDetails.nextMaintenanceDate': 1 });
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET overdue maintenance ──
router.get('/overdue-maintenance', auth, async (req, res) => {
  try {
    const today = new Date();
    
    const items = await Inventory.find({
      category: 'Equipment',
      status: 'Active',
      'equipmentDetails.nextMaintenanceDate': { $lt: today }
    }).populate('vendor', 'name contactPerson phone')
      .sort({ 'equipmentDetails.nextMaintenanceDate': 1 });
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── LOG MAINTENANCE for equipment ──
router.post('/:id/maintenance', auth, async (req, res) => {
  try {
    const { type, performedBy, cost, notes, nextDueDate } = req.body;
    
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.category !== 'Equipment') {
      return res.status(400).json({ message: 'Only equipment items can have maintenance logs' });
    }
    
    // Initialize equipmentDetails if not exists
    if (!item.equipmentDetails) {
      item.equipmentDetails = {};
    }
    if (!item.equipmentDetails.maintenanceLogs) {
      item.equipmentDetails.maintenanceLogs = [];
    }
    
    // Add maintenance log
    const maintenanceLog = {
      date: new Date(),
      type: type || 'Routine',
      performedBy: performedBy || req.user.name || 'Staff',
      cost: cost || 0,
      notes: notes || '',
      nextDueDate: nextDueDate || null
    };
    
    item.equipmentDetails.maintenanceLogs.push(maintenanceLog);
    item.equipmentDetails.lastMaintenanceDate = new Date();
    
    if (nextDueDate) {
      item.equipmentDetails.nextMaintenanceDate = new Date(nextDueDate);
    } else if (item.equipmentDetails.maintenanceIntervalDays) {
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + item.equipmentDetails.maintenanceIntervalDays);
      item.equipmentDetails.nextMaintenanceDate = nextDate;
    }
    
    await item.save();
    
    res.json({
      message: 'Maintenance logged successfully',
      maintenanceLog,
      nextMaintenanceDate: item.equipmentDetails.nextMaintenanceDate
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE equipment condition/status ──
router.patch('/:id/condition', auth, async (req, res) => {
  try {
    const { condition, assignedTo, status } = req.body;
    
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.category !== 'Equipment') {
      return res.status(400).json({ message: 'Only equipment items can update condition' });
    }
    
    if (!item.equipmentDetails) item.equipmentDetails = {};
    if (condition) item.equipmentDetails.condition = condition;
    if (assignedTo) item.equipmentDetails.assignedTo = assignedTo;
    if (status) item.status = status;
    
    await item.save();
    
    res.json({
      message: 'Equipment status updated',
      condition: item.equipmentDetails.condition,
      assignedTo: item.equipmentDetails.assignedTo
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET maintenance history for equipment ──
router.get('/:id/maintenance-history', auth, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id)
      .select('name itemCode equipmentDetails');
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.category !== 'Equipment') {
      return res.status(400).json({ message: 'Not an equipment item' });
    }
    
    res.json({
      item: { id: item._id, name: item.name, itemCode: item.itemCode },
      maintenanceLogs: item.equipmentDetails?.maintenanceLogs || [],
      lastMaintenanceDate: item.equipmentDetails?.lastMaintenanceDate,
      nextMaintenanceDate: item.equipmentDetails?.nextMaintenanceDate
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;