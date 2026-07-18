import mongoose from 'mongoose';

const VentilatorLogSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true, default: 'default' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'ICUBed', required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  
  // ── Ventilator Settings ──
  mode: {
    type: String,
    enum: ['SIMV', 'PSV', 'CPAP', 'PRVC', 'BiPAP', 'HFNC', 'Other'],
    required: true,
  },
  fio2: { type: Number, min: 21, max: 100 }, // 21-100%
  peep: { type: Number, min: 0, max: 30 },   // PEEP in cmH2O
  tidalVolume: { type: Number, min: 0 },      // ml
  rate: { type: Number, min: 0 },             // breaths per minute
  pressureSupport: { type: Number, min: 0 },  // cmH2O
  
  // ── Time Tracking ──
  startTime: { type: Date, required: true, default: Date.now },
  endTime: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  
  // ── Charges ──
  ratePerHour: { type: Number, default: 0 },   // Admin settable
  totalHours: { type: Number, default: 0 },
  totalCharge: { type: Number, default: 0 },
  
  // ── Logged by ──
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loggedByName: { type: String },
  
  notes: { type: String },
}, { timestamps: true });

// Indexes
VentilatorLogSchema.index({ clinicId: 1, patientId: 1, isActive: 1 });
VentilatorLogSchema.index({ clinicId: 1, bedId: 1, isActive: 1 });

// Pre-save hook to calculate total hours and charge
VentilatorLogSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    const diffMs = this.endTime - this.startTime;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    this.totalCharge = Math.round(this.totalHours * this.ratePerHour);
  }
  next();
});

export default mongoose.model('VentilatorLog', VentilatorLogSchema);