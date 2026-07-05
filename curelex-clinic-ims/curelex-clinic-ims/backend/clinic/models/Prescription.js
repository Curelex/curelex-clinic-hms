import mongoose from 'mongoose';

// ── Medicine sub-document ─────────────────────────────────────────────────────
const MedicineSchema = new mongoose.Schema({
  name:         { type: String, required: true },   // e.g. "Paracetamol 500mg"
  dosage:       { type: String, default: '' },       // e.g. "1 tablet"
  frequency:    { type: String, default: '' },       // e.g. "Twice daily"
  duration:     { type: String, default: '' },       // e.g. "5 days"
  instructions: { type: String, default: '' },       // e.g. "After meals"
}, { _id: true });

// ── Test sub-document ─────────────────────────────────────────────────────────
const TestSchema = new mongoose.Schema({
  name:         { type: String, required: true },   // e.g. "CBC", "Urine R/E"
  instructions: { type: String, default: '' },       // e.g. "Fasting"
}, { _id: true });

// ── Main Prescription schema ──────────────────────────────────────────────────
const PrescriptionSchema = new mongoose.Schema({
  // Links
  clinicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic',  required: true },
  doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

  // Denormalized for fast reads (no populates needed)
  // ✅ FIX: removed required:true from doctorName & patientName — they have route-level fallbacks
  //         but required:true causes 500 if an empty string slips through
  doctorName:       { type: String, default: 'Doctor' },
  doctorSpecialist: { type: String, default: '' },
  patientName:      { type: String, default: 'Patient' },
  patientAge:       { type: String, default: '' },
  patientGender:    { type: String, default: '' },
  patientPhone:     { type: String, default: '' },
  clinicName:       { type: String, default: '' },

  // ✅ FIX: date is required but now the route always provides a fallback (getTodayIST)
  date:        { type: String, required: true },  // "YYYY-MM-DD"
  tokenNumber: { type: Number, default: 0 },

  // Prescription content
  diagnosis:    { type: String, default: '' },
  medicines:    { type: [MedicineSchema], default: [] },
  tests:        { type: [TestSchema],    default: [] },
  notes:        { type: String, default: '' },
  followUpDate: { type: String, default: '' },

  // Status flags
  isViewed:    { type: Boolean, default: false },
  isDispensed: { type: Boolean, default: false },
  dispensedAt: { type: Date,    default: null },

}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
PrescriptionSchema.index({ clinicId: 1, date: 1 });
PrescriptionSchema.index({ doctorId: 1, date: 1 });
PrescriptionSchema.index({ patientId: 1 });

const Prescription = mongoose.model('Prescription', PrescriptionSchema);
export default Prescription;