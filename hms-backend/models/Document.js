// hms-backend/models/Document.js
import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  patient:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

  // Optional link to the token/visit this document was uploaded for, if known.
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', default: null },

  category: {
    type: String,
    enum: ['Lab Report', 'Scan / Imaging', 'Prescription', 'Discharge Summary', 'Insurance', 'Other'],
    default: 'Other',
  },
  description: { type: String, default: '' },

  originalName: { type: String, required: true },
  storedName:   { type: String, required: true }, // filename on disk
  mimeType:     { type: String, required: true },
  fileSize:     { type: Number, default: 0 }, // bytes

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  visibleToDoctor: { type: Boolean, default: false },

}, { timestamps: true });

DocumentSchema.index({ clinicId: 1, patient: 1, createdAt: -1 });

export default mongoose.model('Document', DocumentSchema);