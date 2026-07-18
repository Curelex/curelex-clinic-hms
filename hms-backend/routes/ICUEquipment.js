// hms-backend/routes/icuEquipment.js
import express from 'express';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import ICUBed from '../models/ICUBed.js';
import Inventory from '../models/Inventory.js';
import VentilatorLog from '../models/VentilatorLog.js';

const router = express.Router();

function resolveClinicId(req) {
  return req.body?.clinicId || req.query?.clinicId || req.user?.clinicId || 'default';
}

// ── GET available equipment for ICU ──
router.get('/available', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { type } = req.query;
    
    const query = { 
      clinicId, 
      category: 'Equipment',
      status: 'Active',
      quantity: { $gt: 0 }
    };
    
    // Filter by equipment type (ventilator, monitor, etc.)
    if (type) {
      query['equipmentDetails.type'] = type;
    }
    
    const equipment = await Inventory.find(query)
      .select('name itemCode quantity unit equipmentDetails')
      .sort({ name: 1 });
    
    res.json({ success: true, equipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET equipment assigned to a bed ──
router.get('/bed/:bedId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const bed = await ICUBed.findOne({ _id: req.params.bedId, clinicId })
      .select('equipment ventilatorInUse ventilatorInventoryId');
    
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }
    
    res.json({ success: true, equipment: bed.equipment || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ASSIGN equipment to ICU bed ──
router.post('/assign', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { bedId, inventoryId, notes } = req.body;
    
    if (!bedId || !inventoryId) {
      return res.status(400).json({ success: false, message: 'bedId and inventoryId required' });
    }
    
    // Get bed
    const bed = await ICUBed.findOne({ _id: bedId, clinicId });
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }
    
    // Get inventory item
    const inventory = await Inventory.findOne({ _id: inventoryId, clinicId });
    if (!inventory) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }
    
    // Check if equipment is already assigned to this bed
    const alreadyAssigned = bed.equipment.some(e => String(e.inventoryId) === String(inventoryId));
    if (alreadyAssigned) {
      return res.status(400).json({ success: false, message: 'Equipment already assigned to this bed' });
    }
    
    // Add equipment to bed
    bed.equipment.push({
      inventoryId: inventory._id,
      name: inventory.name,
      type: inventory.equipmentDetails?.type || 'Other',
      serialNumber: inventory.equipmentDetails?.serialNumber || '',
      isActive: true,
      assignedAt: new Date(),
      notes: notes || '',
    });
    
    // If ventilator, update ventilator flags
    if (inventory.equipmentDetails?.type === 'Ventilator') {
      bed.ventilatorInUse = true;
      bed.ventilatorStartTime = new Date();
      bed.ventilatorInventoryId = inventory._id;
    }
    
    await bed.save();
    
    // Reduce quantity in inventory
    inventory.quantity -= 1;
    inventory.totalValue = inventory.quantity * inventory.unitPrice;
    await inventory.save();
    
    res.json({ 
      success: true, 
      message: 'Equipment assigned to bed',
      equipment: bed.equipment 
    });
  } catch (err) {
    console.error('Assign equipment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── REMOVE equipment from ICU bed ──
router.delete('/remove/:bedId/:equipmentId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { bedId, equipmentId } = req.params;
    
    const bed = await ICUBed.findOne({ _id: bedId, clinicId });
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }
    
    // Find equipment in bed
    const equipIndex = bed.equipment.findIndex(e => String(e._id) === equipmentId);
    if (equipIndex === -1) {
      return res.status(404).json({ success: false, message: 'Equipment not found on this bed' });
    }
    
    const equip = bed.equipment[equipIndex];
    
    // Return to inventory
    if (equip.inventoryId) {
      const inventory = await Inventory.findOne({ _id: equip.inventoryId, clinicId });
      if (inventory) {
        inventory.quantity += 1;
        inventory.totalValue = inventory.quantity * inventory.unitPrice;
        await inventory.save();
      }
    }
    
    // Remove from bed
    bed.equipment.splice(equipIndex, 1);
    
    // If ventilator, update flags
    if (equip.type === 'Ventilator') {
      bed.ventilatorInUse = false;
      bed.ventilatorStartTime = null;
      bed.ventilatorInventoryId = null;
    }
    
    await bed.save();
    
    res.json({ success: true, message: 'Equipment removed from bed' });
  } catch (err) {
    console.error('Remove equipment error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ventilator logs for a patient ──
router.get('/ventilator-logs/:patientId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const logs = await VentilatorLog.find({ 
      clinicId, 
      patientId: req.params.patientId 
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
