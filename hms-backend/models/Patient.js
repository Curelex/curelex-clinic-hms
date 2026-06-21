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

PatientSchema.pre('save', async function (next) {
  // ✅ If patientId already exists, skip generation
  if (this.patientId) {
    return next();
  }

  if (!this.clinicId) {
    return next(new Error('clinicId is required to generate a patientId'));
  }

  try {
    // ✅ Atomic increment — safe even when multiple patients are created
    // back-to-back (e.g. two token bookings within milliseconds of each
    // other). Replaces the old find-max-then-increment approach, which
    // had a race condition: two concurrent saves could both read "no
    // patients yet" and both try to claim PAT00001.
    const seq = await Counter.getNextSequence(`patient_${this.clinicId}`);

    // ✅ Format with leading zeros (5 digits)
    this.patientId = `PAT${String(seq).padStart(5, '0')}`;

    console.log(`✅ Generated patientId: ${this.patientId} for clinic: ${this.clinicId}`);
    next();
  } catch (err) {
    console.error('❌ Error generating patientId:', err);
    next(err);
  }
});

// Indexes
PatientSchema.index({ clinicId: 1, patientId: 1 }, { unique: true });
PatientSchema.index({ clinicId: 1, email: 1 });
PatientSchema.index({ clinicId: 1, phone: 1 });

export default mongoose.model('Patient', PatientSchema);