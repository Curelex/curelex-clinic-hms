import mongoose from 'mongoose';

const SsoTokenSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  email:     { type: String, required: true },
  role:      { type: String, default: 'staff' },
  clinicId:  { type: String, required: true },
  expiresAt: { type: Date,   required: true },
}, { timestamps: false });

SsoTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.SsoToken || mongoose.model('SsoToken', SsoTokenSchema);
