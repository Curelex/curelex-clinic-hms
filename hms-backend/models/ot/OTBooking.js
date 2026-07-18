import mongoose from 'mongoose';

const OTBookingSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SurgeryRequest', required: true },
  otRoomId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTRoom', required: true },
  
  scheduledStart: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  
  status: {
    type: String,
    enum: ['requested', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  
  notes: { type: String }
}, { timestamps: true });

OTBookingSchema.index({ clinicId: 1, scheduledStart: 1, scheduledEnd: 1 });
OTBookingSchema.index({ otRoomId: 1 });

export default mongoose.model('OTBooking', OTBookingSchema);
