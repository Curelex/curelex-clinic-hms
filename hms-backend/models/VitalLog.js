import mongoose from 'mongoose';

const VitalLogSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true, default: 'default' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'ICUBed', required: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  
  // ── Vitals ──
  heartRate: { type: Number },
  systolicBP: { type: Number },
  diastolicBP: { type: Number },
  spo2: { type: Number },
  temperature: { type: Number },
  respiratoryRate: { type: Number },
  
  // ── GCS (Glasgow Coma Scale) ──
  gcsEye: { type: Number, min: 1, max: 4 },     // 1-4
  gcsVerbal: { type: Number, min: 1, max: 5 },   // 1-5
  gcsMotor: { type: Number, min: 1, max: 6 },    // 1-6
  gcsTotal: { type: Number, min: 3, max: 15 },   // Auto-calculated
  
  // ── RASS (Richmond Agitation-Sedation Scale) ──
  rassScore: { type: Number, min: -5, max: 4 },
  
  // ── Additional ──
  painScore: { type: Number, min: 0, max: 10 },
  urineOutput: { type: Number }, // ml
  fluidBalance: { type: Number }, // ml
  
  // ── Logged by ──
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loggedByName: { type: String },
  
  notes: { type: String },
  
  // ── Auto-logged flag ──
  isAutoLogged: { type: Boolean, default: false },
  
  // ── Monitoring charge for this log ──
  monitoringCharge: { type: Number, default: 0 },
}, { timestamps: true });

// Indexes
VitalLogSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
VitalLogSchema.index({ clinicId: 1, bedId: 1, createdAt: -1 });

// Pre-save hook to calculate GCS total
VitalLogSchema.pre('save', function(next) {
  if (this.gcsEye && this.gcsVerbal && this.gcsMotor) {
    this.gcsTotal = this.gcsEye + this.gcsVerbal + this.gcsMotor;
  }
  next();
});

export default mongoose.model('VitalLog', VitalLogSchema);