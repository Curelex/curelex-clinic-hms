import mongoose from 'mongoose';


const ICUBedSchema = new mongoose.Schema({
  bedNumber: { type: String, required: true },
  roomNumber: { type: String, required: true },
  bedType: {
    type: String,
    enum: ['General ICU', 'Cardiac ICU', 'Pediatric ICU', 'Neuro ICU', 'Surgical ICU', 'Medical ICU'],
    default: 'General ICU',
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Maintenance', 'Reserved', 'Cleaning'],
    default: 'Available',
  },
  clinicId: { type: String, required: true, index: true, default: 'default' },
  
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  
  // ── ADD THIS FIELD ──
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedReceptionist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  // ... rest of fields
});

// Indexes
ICUBedSchema.index({ clinicId: 1, bedNumber: 1 }, { unique: true });
ICUBedSchema.index({ clinicId: 1, status: 1 });
ICUBedSchema.index({ clinicId: 1, patientId: 1 });

export default mongoose.model('ICUBed', ICUBedSchema);