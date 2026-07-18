import mongoose from 'mongoose';

const VitalEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  bp: { type: String }, // e.g. "120/80"
  pulse: { type: Number },
  spo2: { type: Number },
  consciousness: { type: String } // e.g. "Alert", "Drowsy"
});

const PostOpRecordSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTBooking', required: true, unique: true },
  
  pacuAdmitTime: { type: Date }, // Post-Anesthesia Care Unit admission time
  
  vitals: [VitalEntrySchema],
  
  status: {
    type: String,
    enum: ['in_recovery', 'stable', 'ready_for_transfer', 'transferred'],
    default: 'in_recovery'
  },
  
  dischargeTime: { type: Date }, // Time transferred out of PACU/OT
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('PostOpRecord', PostOpRecordSchema);
