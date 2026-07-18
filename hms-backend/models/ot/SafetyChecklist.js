import mongoose from 'mongoose';

const SafetyChecklistSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTBooking', required: true, index: true },
  
  stage: { 
    type: String, 
    enum: ['sign_in', 'time_out', 'sign_out'], 
    required: true 
  },
  
  items: { type: Map, of: Boolean, default: {} }, // JSON object of items { "patient_identity_confirmed": true }
  
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date }
}, { timestamps: true });

// A booking can only have one of each stage
SafetyChecklistSchema.index({ bookingId: 1, stage: 1 }, { unique: true });

export default mongoose.model('SafetyChecklist', SafetyChecklistSchema);
