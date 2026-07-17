import mongoose from 'mongoose';

// models/ICUAdmission.js
const ICUAdmissionSchema = new mongoose.Schema({
  admissionId: { type: String },
  clinicId: { type: String, required: true, index: true, default: 'default' },
  
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'ICUBed', required: true },
  admissionIdRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
  
  // ── Admission Details ──
  admissionDate: { type: Date, default: Date.now },
  dischargeDate: { type: Date, default: null },
  reasonForICU: { type: String, required: true },
  diagnosis: { type: String },
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe', 'Critical'],
    default: 'Moderate',
  },
  
  // ── Staff ──
  attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attendingDoctorName: { type: String },
  admittingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admittingDoctorName: { type: String },
  
  // ── ADD THIS FIELD ──
  assignedReceptionist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedReceptionistName: { type: String },
  
  // ── Ventilator ──
  ventilatorUsed: { type: Boolean, default: false },
  ventilatorStartDate: { type: Date, default: null },
  ventilatorEndDate: { type: Date, default: null },
  
  // ── Status ──
  status: {
    type: String,
    enum: ['Active', 'Discharged', 'Transferred', 'Deceased'],
    default: 'Active',
  },
  
  // ── Billing ──
  totalCharges: { type: Number, default: 0 },
  billingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing' },
  
  notes: { type: String },
}, { timestamps: true });

// Indexes
ICUAdmissionSchema.index({ clinicId: 1, admissionId: 1 }, { unique: true });
ICUAdmissionSchema.index({ clinicId: 1, patientId: 1, status: 1 });
ICUAdmissionSchema.index({ clinicId: 1, bedId: 1, status: 1 });

// Pre-save hook to generate admissionId
ICUAdmissionSchema.pre('save', async function(next) {
  if (this.admissionId) return next();
  try {
    const ICUAdmission = mongoose.model('ICUAdmission');
    const last = await ICUAdmission.findOne({ clinicId: this.clinicId, admissionId: /^ICU\d+$/ })
      .sort({ admissionId: -1 })
      .select('admissionId')
      .lean();
    
    let nextNumber = 1;
    if (last?.admissionId) {
      const parsed = parseInt(last.admissionId.slice(3), 10);
      if (!isNaN(parsed)) nextNumber = parsed + 1;
    }
    this.admissionId = 'ICU' + String(nextNumber).padStart(5, '0');
    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.model('ICUAdmission', ICUAdmissionSchema);