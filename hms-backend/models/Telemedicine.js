// hms-backend/models/Telemedicine.js
import mongoose from 'mongoose';

const TelemedicineSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
  },
  
  // Request details
  symptoms: { type: String },
  preferredTime: { type: Date },
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal',
  },
  
  // Meeting details
  scheduledTime: { type: Date },
  meetingLink: { type: String },
  meetingId: { type: String },
  
  // Status flow
  status: {
    type: String,
    enum: ['requested', 'approved', 'scheduled', 'ready', 'ongoing', 'completed', 'cancelled', 'rejected'],
    default: 'requested',
  },
  
  // Notes
  doctorNotes: { type: String },
  patientNotes: { type: String },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
  },
  
  // Duration tracking
  startedAt: { type: Date },
  endedAt: { type: Date },
  durationMinutes: { type: Number },
  
  // Denormalized fields
  patientName: { type: String },
  patientEmail: { type: String },
  patientPhone: { type: String },
  doctorName: { type: String },
  doctorSpecialization: { type: String },
  
  // Payment
  consultationFee: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  
}, { timestamps: true });

// Indexes
TelemedicineSchema.index({ patientId: 1, status: 1 });
TelemedicineSchema.index({ doctorId: 1, status: 1 });
TelemedicineSchema.index({ clinicId: 1, status: 1 });
TelemedicineSchema.index({ status: 1, createdAt: -1 });

// Virtual for isUrgent
TelemedicineSchema.virtual('isUrgent').get(function() {
  return this.urgency === 'urgent' || this.urgency === 'emergency';
});

// Virtual for isActive
TelemedicineSchema.virtual('isActive').get(function() {
  return ['requested', 'approved', 'scheduled', 'ready', 'ongoing'].includes(this.status);
});

TelemedicineSchema.set('toJSON', { virtuals: true });
TelemedicineSchema.set('toObject', { virtuals: true });

export default mongoose.model('Telemedicine', TelemedicineSchema);