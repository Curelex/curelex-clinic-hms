import mongoose from 'mongoose';

const ssoTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  email:     { type: String, required: true },
  role:      { type: String, default: 'staff' },
  clinicId:  { type: String, required: true },
  expiresAt: { type: Date,   required: true },
}, { timestamps: false });

ssoTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.SsoToken || mongoose.model('SsoToken', ssoTokenSchema);