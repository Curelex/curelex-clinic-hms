// hms-backend/models/Patient.js
import mongoose from 'mongoose';
import Counter from './Counter.js';

const PatientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },

  patientId: { type: String },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },

  dob: { type: Date, default: null },
  age: { type: Number, default: null },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', null],
    default: null
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
    default: null
  },

  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },

  emergencyContact: { type: String, default: '' },
  emergencyName: { type: String, default: '' },
  emergencyRelation: { type: String, default: '' },

  allergies: { type: String, default: '' },
  chronicConditions: { type: String, default: '' },
  currentMedications: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
  notes: { type: String, default: '' },

  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },

  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Discharged', 'Deceased'],
    default: 'Active',
  },

  registrationDate: { type: Date, default: Date.now },

  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  photo: { type: String, default: '' },
  photoPublicId: { type: String, default: '' },

}, { timestamps: true });

// ── Auto-generate patientId ────────────────────────────────────────
// Uses an atomic per-clinic counter (separate Counter collection) instead
// of scanning/sorting Patient documents. findByIdAndUpdate + $inc is a
// single atomic MongoDB operation, so two concurrent registrations can
// never receive the same number — no race condition, no retry loop needed.
//
// IMPORTANT: this only runs when patientId is NOT already set on the
// document. If you are seeing duplicate IDs (e.g. everyone getting
// PAT00001), check your controller / frontend for code that explicitly
// sets `patientId` before calling .save() (e.g. a hardcoded default in
// a form or seed script) — that will bypass this hook entirely.
PatientSchema.pre('save', async function (next) {
  if (this.patientId) return next(); // already set explicitly, skip

  if (!this.clinicId) {
    return next(new Error('clinicId is required to generate a patientId'));
  }

  try {
    const counterId = `patient_${this.clinicId}`;

    const counter = await Counter.findByIdAndUpdate(
      counterId,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    this.patientId = `PAT${String(counter.seq).padStart(5, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Indexes
PatientSchema.index({ clinicId: 1, patientId: 1 }, { unique: true });
PatientSchema.index({ clinicId: 1, email: 1 });
PatientSchema.index({ clinicId: 1, phone: 1 });

export default mongoose.model('Patient', PatientSchema);