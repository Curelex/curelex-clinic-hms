// hms-backend/models/Discharge.js
import mongoose from 'mongoose';

const DischargeSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true },
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  
  dischargeDate: { type: Date, required: true },
  dischargeType: {
    type: String,
    enum: ['Regular', 'Against Medical Advice', 'Referred', 'Transfer'],
    default: 'Regular',
  },
  
  reason: { type: String },
  followUpInstructions: { type: String },
  patientCondition: {
    type: String,
    enum: ['Stable', 'Improved', 'Not Improved', 'Critical'],
    default: 'Stable',
  },
  
  satisfied: { type: Boolean, default: true },
  feedback: { type: String },
  notes: { type: String },
  
  billSettlement: {
    type: String,
    enum: ['Fully Paid', 'Pending', 'Insurance Claim'],
    default: 'Pending',
  },
  billSettlementDate: { type: Date },
  
  dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dischargedByName: { type: String },
  
}, { timestamps: true });

export default mongoose.model('Discharge', DischargeSchema);