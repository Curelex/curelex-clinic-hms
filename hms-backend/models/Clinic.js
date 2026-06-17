// hms-backend/models/Clinic.js  ← NEW FILE
import mongoose from 'mongoose';

const ClinicSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true, unique: true },
  phone:   { type: String },
  address: { type: String },
}, { timestamps: true });

export default mongoose.model('Clinic', ClinicSchema);