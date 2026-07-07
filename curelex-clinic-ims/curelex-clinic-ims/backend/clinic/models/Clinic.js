import mongoose from 'mongoose';

const ClinicSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  owner:    { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone:    { type: String, default: '' },
  whatsapp: { type: String, default: '' },
  address:  { type: String, default: '' },
  city:     { type: String, default: '' },
  district: { type: String, default: '' },
  state:    { type: String, default: '' },

  // Subscription — now supports lite, plus, pro
  plan:            { type: String, enum: ['lite', 'plus', 'pro', null], default: null },
  planActivatedAt: { type: String, default: null },
  planExpiresAt:   { type: String, default: null },

  createdAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
}, { timestamps: true });

const Clinic = mongoose.model('Clinic', ClinicSchema);

export default Clinic;