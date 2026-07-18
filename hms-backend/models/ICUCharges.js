import mongoose from 'mongoose';

const ICUChargesSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true, default: 'default' },
  
  // ── Base ICU Rates (per bed type) ──
  generalICU: { type: Number, default: 4000 },
  cardiacICU: { type: Number, default: 5000 },
  pediatricICU: { type: Number, default: 4500 },
  neuroICU: { type: Number, default: 5500 },
  surgicalICU: { type: Number, default: 4800 },
  medicalICU: { type: Number, default: 4200 },
  
  // ── Additional Charges ──
  ventilatorRatePerHour: { type: Number, default: 150 },
  ventilatorRatePerDay: { type: Number, default: 1500 },
  monitoringRatePerHour: { type: Number, default: 50 },
  monitoringRatePerDay: { type: Number, default: 500 },
  dialysisRatePerSession: { type: Number, default: 3000 },
  
  // ── Special Equipment Rates ──
  specialEquipment: [{
    name: { type: String, required: true },
    ratePerHour: { type: Number, default: 0 },
    ratePerDay: { type: Number, default: 0 },
  }],
  
  // ── Effective Date ──
  effectiveDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  
  // ── Updated by ──
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByName: { type: String },
  
  notes: { type: String },
}, { timestamps: true });

// Index for getting active charges
ICUChargesSchema.index({ clinicId: 1, isActive: 1, effectiveDate: -1 });

export default mongoose.model('ICUCharges', ICUChargesSchema);