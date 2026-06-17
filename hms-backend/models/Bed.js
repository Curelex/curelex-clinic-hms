// hms-backend/models/Bed.js
import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  bedNumber: { type: String, required: true },
  roomNumber: { type: String, required: true },
  roomType: {
    type: String,
    enum: ['General Ward', 'Semi-Private', 'Private Room', 'ICU'],
    required: true,
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Reserved', 'Under Cleaning'],
    default: 'Available',
  },
  isEmergencyEligible: { type: Boolean, default: false },
  clinicId: { type: String, required: true, default: 'default' },
}, { timestamps: true });

// Ensure bedNumber is unique per clinic
bedSchema.index({ clinicId: 1, bedNumber: 1 }, { unique: true });

export default mongoose.model('Bed', bedSchema);
