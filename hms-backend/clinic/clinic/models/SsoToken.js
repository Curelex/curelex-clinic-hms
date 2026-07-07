import mongoose from 'mongoose';
import { clinicConnection } from '../config/db.js';

const SsoTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  email:     { type: String, required: true },
  role:      { type: String, default: 'staff' },
  clinicId:  { type: String, required: true },
  expiresAt: { type: Date,   required: true },
}, { timestamps: false });

SsoTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default clinicConnection.models.SsoToken || clinicConnection.model('SsoToken', SsoTokenSchema);
