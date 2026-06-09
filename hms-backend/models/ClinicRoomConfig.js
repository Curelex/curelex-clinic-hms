// hms-backend/models/ClinicRoomConfig.js
const mongoose = require('mongoose');

const ClinicRoomConfig = new mongoose.Schema({
  clinicId: { 
    type: String, 
    required: true,
    index: true 
  },  // each clinic has unique ID (you can use tenant ID or clinic code)
  roomType: {
    type: String,
    enum: ['General Ward', 'Semi-Private', 'Private Room', 'ICU'],
    required: true,
  },
  dailyRate: { type: Number, required: true, default: 800 },
  totalRooms: { type: Number, required: true, default: 5 },
  availableRooms: { type: Number, required: true, default: 5 },
}, { timestamps: true });

// Compound unique index: one config per clinic per room type
ClinicRoomConfig.index({ clinicId: 1, roomType: 1 }, { unique: true });

module.exports = mongoose.model('ClinicRoomConfig', ClinicRoomConfig);