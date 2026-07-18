import mongoose from 'mongoose';

const OTRoomSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true },
  name: { type: String, required: true }, // e.g. "OT-1"
  location: { type: String }, // e.g. "2nd Floor, West Wing"
  equipmentTags: [{ type: String }], // Array of strings e.g. ["Ventilator", "C-Arm"]
  active: { type: Boolean, default: true }
}, { timestamps: true });

OTRoomSchema.index({ clinicId: 1, name: 1 }, { unique: true });

export default mongoose.model('OTRoom', OTRoomSchema);
