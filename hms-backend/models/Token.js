// hms-backend/models/Token.js
import mongoose from 'mongoose';

const TokenSchema = new mongoose.Schema({
  // ── Core fields ──
  tokenNumber: {
    type: Number,
    required: true,
  },
  date: {
    type: String, // "YYYY-MM-DD" format for easy daily queries
    required: true,
    index: true,
  },
  
  // ── Relationships ──
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    index: true,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // ── Patient info (denormalized for quick display) ──
  patientName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  email: {
    type: String,
  },
  age: {
    type: Number,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', null],
    default: null,
  },

  // ── Status ──
  status: {
    type: String,
    enum: ['Pending', 'Waiting', 'Called', 'Done', 'Skipped'],
    default: 'Waiting',
    index: true,
  },
  calledAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },

  // ── Source ──
  source: {
    type: String,
    enum: ['staff', 'patient'],
    default: 'staff',
  },

  // ── Consultation details ──
  consultationType: {
    type: String,
    enum: ['in-person', 'telemedicine', 'follow-up', 'online'],
    default: 'in-person',
  },
  consultationFee: {
    type: Number,
    default: 0,
  },
  symptoms: {
    type: String,
  },
  notes: {
    type: String,
  },

  // ── Payment ──
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'insurance', null],
    default: null,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'pending',
  },
  paymentAmount: {
    type: Number,
    default: 0,
  },

}, { timestamps: true });

// ── Indexes ──
// Unique token number per clinic, per doctor, per day
TokenSchema.index({ clinicId: 1, doctor: 1, date: 1, tokenNumber: 1 }, { unique: true });

// For fast status queries
TokenSchema.index({ clinicId: 1, status: 1, date: 1 });

// For patient lookups
TokenSchema.index({ clinicId: 1, patient: 1 });

export default mongoose.model('Token', TokenSchema);