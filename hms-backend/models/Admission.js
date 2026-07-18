// hms-backend/models/Admission.js

import mongoose from 'mongoose';

const MedicineLogSchema = new mongoose.Schema({
  medicineName:  { type: String, required: true },
  dosage:        { type: String },
  quantity:      { type: Number, default: 1 },
  unitPrice:     { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  givenAt:       { type: Date, default: Date.now },
  givenBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  givenByName:   { type: String },
  notes:         { type: String },
});

const FollowupLogSchema = new mongoose.Schema({
  note:          { type: String, required: true },
  type:          { type: String, enum: ['Doctor', 'Nurse', 'General'], default: 'General' },
  writtenBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  writtenByName: { type: String },
  writtenAt:     { type: Date, default: Date.now },
  vitals: {
    bp:     String,
    temp:   String,
    pulse:  String,
    spo2:   String,
    weight: String,
  },
});

const AdmissionSchema = new mongoose.Schema({
  // ── Existing fields ──
  admissionId:    { type: String },
  clinicId:       { type: String, required: true, index: true, default: 'default' },
  patient:        { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admittedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admittedByName: { type: String },
 
  admissionDate: { type: Date, default: Date.now },
  dischargeDate: { type: Date },
  daysAdmitted:  { type: Number, default: 0 },
 
  roomType: {
    type: String,
    enum: ['General Ward', 'Semi-Private', 'Private Room', 'ICU'],
    default: 'General Ward',
  },
  roomNumber:     { type: String },
  roomRatePerDay: { type: Number, default: 800 },
  roomRent:       { type: Number, default: 0 },
 
  status: {
    type: String,
    enum: ['Admitted', 'Discharged', 'Transferred'],
    default: 'Admitted',
  },
 
  medicineLog: [MedicineLogSchema],
  followupLog: [FollowupLogSchema],
 
  bill:  { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
  notes: { type: String },

  // ── NEW: ICU Fields ──
  isICU: { type: Boolean, default: false },
  icuBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'ICUBed', default: null },
  icuAdmissionDate: { type: Date, default: null },
  icuDischargeDate: { type: Date, default: null },
  
  // ── ICU Ventilator ──
  ventilatorUsed: { type: Boolean, default: false },
  ventilatorStartDate: { type: Date, default: null },
  ventilatorEndDate: { type: Date, default: null },
  
  // ── ICU Severity ──
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe', 'Critical'],
    default: 'Moderate',
  },
  reasonForICU: { type: String },
  diagnosis: { type: String },
  
  // ── ICU Charges ──
  icuBaseCharges: { type: Number, default: 0 },
  icuVentilatorCharges: { type: Number, default: 0 },
  icuMonitoringCharges: { type: Number, default: 0 },
  icuDialysisCharges: { type: Number, default: 0 },
  icuEquipmentCharges: { type: Number, default: 0 },
  icuTotalCharges: { type: Number, default: 0 },
  
  // ── ICU Staff ──
  icuAssignedReceptionist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  icuAssignedReceptionistName: { type: String },

}, { timestamps: true });
 
AdmissionSchema.index({ clinicId: 1, admissionId: 1 }, { unique: true });
AdmissionSchema.index({ clinicId: 1, patient: 1, status: 1 });

// ─── admissionId generation ────────────────────────────────────────
AdmissionSchema.pre('save', async function (next) {
  if (this.admissionId) return next();

  try {
    const AdmissionModel = mongoose.model('Admission');
    const last = await AdmissionModel
      .findOne({ clinicId: this.clinicId, admissionId: /^ADM\d+$/ })
      .sort({ admissionId: -1 })
      .select('admissionId')
      .lean();

    let nextNumber = 1;
    if (last?.admissionId) {
      const parsed = parseInt(last.admissionId.slice(3), 10);
      if (!isNaN(parsed)) nextNumber = parsed + 1;
    }

    this.admissionId = 'ADM' + String(nextNumber).padStart(5, '0');
    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model('Admission', AdmissionSchema);