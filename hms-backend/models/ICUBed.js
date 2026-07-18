// hms-backend/models/ICUBed.js
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
  
  // ── Patient Assignment ──
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
  
  // ── Staff Assignment ──
  assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedReceptionist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  // ── Equipment assigned to bed ──
  equipment: [{
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['Ventilator', 'Monitor', 'Infusion Pump', 'Dialysis', 'Defibrillator', 'Other'],
      default: 'Other'
    },
    serialNumber: { type: String },
    isActive: { type: Boolean, default: true },
    assignedAt: { type: Date, default: Date.now },
    notes: { type: String },
  }],
  
  // ── Ventilator specific ──
  ventilatorInUse: { type: Boolean, default: false },
  ventilatorStartTime: { type: Date, default: null },
  ventilatorInventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', default: null },
  
  // ── ICU Rates ──
  baseDailyRate: { type: Number, default: 4000 },
  ventilatorRate: { type: Number, default: 1500 },
  monitoringRate: { type: Number, default: 500 },
  dialysisRate: { type: Number, default: 3000 },
  
  // ── ICU Admission Details ──
  admissionDate: { type: Date, default: null },
  dischargeDate: { type: Date, default: null },
  reasonForICU: { type: String },
  diagnosis: { type: String },
  
  lastVitalTime: { type: Date, default: null },
  
  notes: { type: String },
}, { timestamps: true });

// ── Indexes ──
ICUBedSchema.index({ clinicId: 1, bedNumber: 1 }, { unique: true });
ICUBedSchema.index({ clinicId: 1, status: 1 });
ICUBedSchema.index({ clinicId: 1, patientId: 1 });

export default mongoose.model('ICUBed', ICUBedSchema);