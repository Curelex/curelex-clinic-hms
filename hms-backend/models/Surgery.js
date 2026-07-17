import mongoose from 'mongoose';

const SurgerySchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  surgeryName: {
    type: String,
    required: true,
  },
  operationTheatreNum: {
    type: String,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  surgeonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  anesthetistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In-Progress', 'Completed', 'Cancelled'],
    default: 'Scheduled',
  },
  preOpChecklist: [{
    task: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    completedAt: { type: Date, default: null }
  }],
  consentForms: [{
    documentName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  postOpRecovery: {
    notes: { type: String, default: '' },
    condition: { type: String, default: '' },
    vitals: [{
      timestamp: { type: Date, default: Date.now },
      hr: { 
        type: Number, 
        min: [0, 'Heart rate cannot be negative'], 
        max: [300, 'Heart rate cannot exceed 300'] 
      },
      bpSystolic: { 
        type: Number, 
        min: [0, 'Systolic BP cannot be negative'], 
        max: [300, 'Systolic BP cannot exceed 300'] 
      },
      bpDiastolic: { 
        type: Number, 
        min: [0, 'Diastolic BP cannot be negative'], 
        max: [200, 'Diastolic BP cannot exceed 200'] 
      },
      spo2: { 
        type: Number, 
        min: [0, 'SpO2 cannot be below 0'], 
        max: [100, 'SpO2 cannot exceed 100'] 
      },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

// Compound indexes for querying and conflict checks
SurgerySchema.index({ clinicId: 1, startTime: 1, endTime: 1 });
SurgerySchema.index({ operationTheatreNum: 1, startTime: 1, endTime: 1 });
SurgerySchema.index({ surgeonId: 1, startTime: 1, endTime: 1 });
SurgerySchema.index({ anesthetistId: 1, startTime: 1, endTime: 1 });

export default mongoose.model('Surgery', SurgerySchema);
