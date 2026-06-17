// hms-backend/models/Appointment.js
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: String,
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String, // e.g. "10:30 AM"
      required: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'No-Show'],
      default: 'Scheduled',
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index for the clinic + date range queries used in dashboard
appointmentSchema.index({ clinicId: 1, date: 1 });
appointmentSchema.index({ clinicId: 1, status: 1 });
appointmentSchema.index({ clinicId: 1, doctor: 1 });

export default mongoose.model('Appointment', appointmentSchema);