// hms-backend/models/Lab.js
import mongoose from 'mongoose';

const LabSchema = new mongoose.Schema({
  labId:    { type: String },

  // ✅ FIXED: was `{ type: String, default: 'default' }` — inconsistent with
  // every other clinic-scoped model (Patient.clinicIds, Token.clinicId,
  // User.clinicId), all of which are real ObjectId refs to Clinic.
  // A bare String with a 'default' fallback meant super_admin requests with
  // no clinic selected silently wrote into an orphan 'default' bucket that
  // no real clinic could ever see or query.
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true,
  },

  patient:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  orderedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tests: [{
    testName:       { type: String, required: true },
    testCode:       String,
    category:       { type: String, enum: ['Blood', 'Urine', 'Imaging', 'Microbiology', 'Other'], default: 'Blood' },
    price:          { type: Number, default: 0 },
    result:         String,
    referenceRange: String,
    unit:           String,
    status:         { type: String, enum: ['Pending', 'Processing', 'Completed'], default: 'Pending' },
  }],
  totalAmount:       { type: Number, default: 0 },
  priority:          { type: String, enum: ['Normal', 'Urgent', 'STAT'], default: 'Normal' },
  sampleCollectedAt: Date,
  reportGeneratedAt: Date,
  status: {
    type: String,
    enum: ['Ordered', 'Sample Collected', 'Processing', 'Completed', 'Cancelled'],
    default: 'Ordered',
  },
  remarks: String,
}, { timestamps: true });

LabSchema.index({ clinicId: 1, labId: 1 }, { unique: true });

LabSchema.pre('save', async function (next) {
  if (!this.labId) {
    const count  = await mongoose.model('Lab').countDocuments({ clinicId: this.clinicId });
    this.labId   = 'LAB' + String(count + 1).padStart(5, '0');
  }
  next();
});

export default mongoose.model('Lab', LabSchema);