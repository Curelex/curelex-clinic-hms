import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  clinicId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
  doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  doctorName: { type: String, required: true },

  // ✅ NEW: track which receptionist registered this patient
  receptionistId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receptionistName: { type: String, default: '' },

  token:    { type: Number, required: true },
  name:     { type: String, required: true },
  age:      { type: String, default: '' },
  phone:    { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  gender:   { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  symptoms: { type: String, required: true },
  notes:    { type: String, default: '' },

  totalFee:      { type: Number, default: 0 },
  paid:          { type: Number, default: 0 },
  dues:          { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cash', 'upi'], default: 'cash' },

  date:   { type: String, required: true },  // "YYYY-MM-DD"
  time:   { type: String, required: true },  // "HH:MM AM/PM"
  status: { type: String, enum: ['waiting', 'called', 'done'], default: 'waiting' },

  // ── Follow-up ─────────────────────────────────────────────────
  followUpDate: { type: String, default: '' },  // "YYYY-MM-DD"
  followUpNote: { type: String, default: '' },  // optional note

  // ── File Uploads (images & PDFs only) ──────────────────────────
  files: [{
    _id:        { type: mongoose.Schema.Types.ObjectId, auto: true },
    filename:   { type: String, required: true },
    mimeType:   { type: String, required: true },
    size:       { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    data:       { type: Buffer, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

const Patient = mongoose.model('Patient', PatientSchema);
export default Patient;