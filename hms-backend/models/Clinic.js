// hms-backend/models/Clinic.js  ← NEW FILE
import mongoose from 'mongoose';

const ClinicSchema = new mongoose.Schema({
  name:    { type: String, required: true, unique: true },
  email:   { type: String, required: true, unique: true },
  phone:   { type: String },
  address: { type: String },
   type: {
    type: String,
    enum: ['hospital', 'clinic'],
    default: 'clinic',
  },
}, { timestamps: true });

export default mongoose.model('Clinic', ClinicSchema);