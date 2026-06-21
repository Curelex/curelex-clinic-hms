// hms-backend/models/Prescription.js
import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
  // Patient reference
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  
  // Doctor reference
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Clinic reference
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
  },
  
  // Optional appointment reference
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  
  // Optional token reference
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
  },
  
  // Denormalized fields for quick access
  patientName: { type: String },
  patientEmail: { type: String },
  patientPhone: { type: String },
  doctorName: { type: String },
  doctorSpecialization: { type: String },
  
  // Prescription details
  medicines: [{
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    name: { type: String, required: true },
    dosage: { type: String, required: true }, // e.g., "1 tablet", "10ml"
    frequency: { type: String, required: true, default: 'Once daily' },
    duration: { type: String, required: true }, // e.g., "5 days", "2 weeks"
    strength: { type: String },
    instructions: { type: String },
    quantity: { type: Number, default: 1 },
  }],
  
  notes: { type: String },
  
  // Diagnosis from the consultation
  diagnosis: { type: String },
  chiefComplaint: { type: String },
  
  // Follow-up information
  followUpDate: { type: Date },
  followUpInstructions: { type: String },
  
  // Tests ordered
  tests: [{
    name: { type: String },
    type: { type: String, default: 'Pathology' },
    instructions: { type: String },
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'dispensed', 'completed', 'cancelled'],
    default: 'active',
  },
  
  // Metadata
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdByRole: {
    type: String,
    enum: ['doctor', 'admin', 'nurse'],
    default: 'doctor',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Expiry - prescriptions are valid for 1 year by default
  validUntil: { type: Date },
  
}, { timestamps: true });

// Indexes for performance
PrescriptionSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ doctorId: 1, createdAt: -1 });
PrescriptionSchema.index({ clinicId: 1, status: 1 });
PrescriptionSchema.index({ patientId: 1, status: 1 });
PrescriptionSchema.index({ appointmentId: 1 });
PrescriptionSchema.index({ tokenId: 1 });

// Virtual for medicine count
PrescriptionSchema.virtual('medicineCount').get(function() {
  return this.medicines ? this.medicines.length : 0;
});

// Virtual for total tests
PrescriptionSchema.virtual('testCount').get(function() {
  return this.tests ? this.tests.length : 0;
});

// Auto-set validUntil to 1 year from creation
PrescriptionSchema.pre('save', function(next) {
  if (!this.validUntil) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    this.validUntil = date;
  }
  next();
});

// Ensure virtuals are included in JSON
PrescriptionSchema.set('toJSON', { virtuals: true });
PrescriptionSchema.set('toObject', { virtuals: true });

export default mongoose.model('Prescription', PrescriptionSchema);