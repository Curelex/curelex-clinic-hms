// hms-backend/routes/roomSettings.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ClinicRoomConfig = require('../models/ClinicRoomConfig');

// ── Helper: Check if user has permission ──
const hasPerm = (user, permKey) => {
  
  return user.permissions && user.permissions.includes(permKey);
};

// ── GET room config (any authenticated user) ──
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const configs = await ClinicRoomConfig.find({ clinicId });
    
    if (configs.length === 0) {
      const defaults = [
        { roomType: 'General Ward', dailyRate: 800, totalRooms: 5, availableRooms: 5 },
        { roomType: 'Semi-Private', dailyRate: 1500, totalRooms: 4, availableRooms: 4 },
        { roomType: 'Private Room', dailyRate: 2500, totalRooms: 3, availableRooms: 3 },
        { roomType: 'ICU', dailyRate: 4000, totalRooms: 4, availableRooms: 4 },
      ];
      return res.json(defaults);
    }
    
    res.json(configs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE room config (requires 'room-settings' permission) ──
router.post('/bulk', auth, async (req, res) => {
  try {
    // Check permission
    if (!hasPerm(req.user, 'room-settings')) {
      return res.status(403).json({ 
        message: 'Access denied. You need room-settings permission.' 
      });
    }
    
    const clinicId = req.user.clinicId || 'default';
    const { configs } = req.body;
    
    const operations = configs.map(config => ({
      updateOne: {
        filter: { clinicId, roomType: config.roomType },
        update: { 
          $set: { 
            dailyRate: config.dailyRate, 
            totalRooms: config.totalRooms,
            availableRooms: config.availableRooms 
          } 
        },
        upsert: true
      }
    }));
    
    await ClinicRoomConfig.bulkWrite(operations);
    res.json({ message: 'Room settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Single update (requires 'room-settings' permission) ──
router.put('/:roomType', auth, async (req, res) => {
  try {
    if (!hasPerm(req.user, 'room-settings')) {
      return res.status(403).json({ 
        message: 'Access denied. You need room-settings permission.' 
      });
    }
    
    const clinicId = req.user.clinicId || 'default';
    const { roomType } = req.params;
    const { dailyRate, totalRooms, availableRooms } = req.body;
    
    const config = await ClinicRoomConfig.findOneAndUpdate(
      { clinicId, roomType },
      { dailyRate, totalRooms, availableRooms },
      { upsert: true, new: true }
    );
    
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;