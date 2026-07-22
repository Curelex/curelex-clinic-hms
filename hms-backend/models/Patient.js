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

  firstName: { type: String, default: '' },
  middleName: { type: String, default: '' },
  lastName: { type: String, default: '' },

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

  maritalStatus: { type: String, default: '' },
  nationality: { type: String, default: 'Indian' },
  occupation: { type: String, default: '' },
  govtIdType: { type: String, default: '' },
  govtIdNumber: { type: String, default: '' },

  alternatePhone: { type: String, default: '' },
  houseNo: { type: String, default: '' },
  street: { type: String, default: '' },
  landmark: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: 'India' },
  pincode: { type: String, default: '' },

  emergencyContact: { type: String, default: '' },
  emergencyName: { type: String, default: '' },
  emergencyRelation: { type: String, default: '' },
  emergencyAltContact: { type: String, default: '' },
  emergencyAddress: { type: String, default: '' },

  allergies: { type: String, default: '' },
  chronicConditions: { type: String, default: '' },
  currentMedications: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
  notes: { type: String, default: '' },

  clinicIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    index: true,
  }],

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

  try {
    // ✅ Generate global patient ID
    const seq = await Counter.getNextSequence('patient_global');

    // ✅ Format with leading zeros (5 digits) using GPAT for Global Patients
    // to avoid collisions with existing PATxxxxx IDs that were clinic-scoped.
    this.patientId = `GPAT${String(seq).padStart(5, '0')}`;

    console.log(`✅ Generated global patientId: ${this.patientId}`);
    next();
  } catch (err) {
    console.error('❌ Error generating patientId:', err);
    next(err);
  }
});

// Indexes
PatientSchema.index({ patientId: 1 }, { unique: true });
PatientSchema.index({ clinicIds: 1, email: 1 });
PatientSchema.index({ clinicIds: 1, phone: 1 });

export default mongoose.model('Patient', PatientSchema);