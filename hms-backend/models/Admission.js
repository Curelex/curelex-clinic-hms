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

  // ── Extended Patient Admission Form Fields ──
  admissionType: {
    type: String,
    enum: ['Emergency', 'OPD to IPD', 'Direct Admission', 'Day Care', 'ICU'],
    default: 'Direct Admission',
  },
  department: { type: String, default: 'General Medicine' },
  referringDoctor: { type: String, default: '' },
  bedNumber: { type: String, default: '' },
  expectedStay: { type: String, default: '' },
  chiefComplaint: { type: String, default: '' },

  contactDetails: {
    alternatePhone: { type: String, default: '' },
    email:          { type: String, default: '' },
    houseNo:        { type: String, default: '' },
    street:         { type: String, default: '' },
    landmark:       { type: String, default: '' },
    city:           { type: String, default: '' },
    district:       { type: String, default: '' },
    state:          { type: String, default: '' },
    country:        { type: String, default: 'India' },
    pincode:        { type: String, default: '' },
  },

  emergencyContact: {
    name:         { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone:        { type: String, default: '' },
    alternatePhone: { type: String, default: '' },
    address:      { type: String, default: '' },
  },

  medicalHistory: {
    conditions:        [{ type: String }],
    otherConditions:   { type: String, default: '' },
    previousSurgeries: { type: String, default: '' },
    allergies:         [{ type: String }],
    allergyDetails:    { type: String, default: '' },
    currentMedications: [{
      medicine: { type: String },
      dose:     { type: String },
      frequency:{ type: String },
    }],
  },

  vitals: {
    height:     { type: String, default: '' },
    weight:     { type: String, default: '' },
    bmi:        { type: String, default: '' },
    bp:         { type: String, default: '' },
    pulse:      { type: String, default: '' },
    temp:       { type: String, default: '' },
    respRate:   { type: String, default: '' },
    spo2:       { type: String, default: '' },
    bloodSugar: { type: String, default: '' },
    painScore:  { type: String, default: '' },
  },

  clinicalAssessment: {
    presentIllness:       { type: String, default: '' },
    provisionalDiagnosis: { type: String, default: '' },
    doctorNotes:          { type: String, default: '' },
  },

  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Insurance', 'Other'],
    default: 'Cash',
  },

  documentChecklist: {
    aadhaar:        { type: Boolean, default: false },
    prescriptions:  { type: Boolean, default: false },
    medicalReports: { type: Boolean, default: false },
    labReports:     { type: Boolean, default: false },
    xray:           { type: Boolean, default: false },
    ctScan:         { type: Boolean, default: false },
    mri:            { type: Boolean, default: false },
    ecg:            { type: Boolean, default: false },
    otherDetails:   { type: String, default: '' },
  },

  consent: {
    agreed:       { type: Boolean, default: false },
    signedBy:     { type: String, default: '' },
    relationship: { type: String, default: '' },
    timestamp:    { type: Date, default: null },
  },

  isQuickAdmit: { type: Boolean, default: false },

}, { timestamps: true });
 
AdmissionSchema.index({ clinicId: 1, admissionId: 1 }, { unique: true });
AdmissionSchema.index({ clinicId: 1, patient: 1, status: 1 });

// ─── admissionId generation ────────────────────────────────────────
AdmissionSchema.pre('save', async function (next) {
  if (this.admissionId) return next();

  try {
    const AdmissionModel = mongoose.model('Admission');
    const allAdmissions = await AdmissionModel
      .find({ admissionId: /^ADM\d+$/ })
      .select('admissionId')
      .lean();

    let maxNum = 0;
    if (allAdmissions && allAdmissions.length > 0) {
      for (const adm of allAdmissions) {
        if (adm.admissionId) {
          const parsed = parseInt(adm.admissionId.replace('ADM', ''), 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      }
    }

    const nextNumber = maxNum + 1;
    this.admissionId = 'ADM' + String(nextNumber).padStart(5, '0');
    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model('Admission', AdmissionSchema);