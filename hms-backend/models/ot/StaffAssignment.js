import mongoose from 'mongoose';

const StaffAssignmentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTBooking', required: true, index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { 
    type: String, 
    enum: ['surgeon', 'assistant_surgeon', 'anesthetist', 'nurse'], 
    required: true 
  }
}, { timestamps: true });

// Prevent duplicate assignment of the same staff to the same booking
StaffAssignmentSchema.index({ bookingId: 1, staffId: 1 }, { unique: true });
// Optimize role-scoped calendar queries
StaffAssignmentSchema.index({ staffId: 1 });

export default mongoose.model('StaffAssignment', StaffAssignmentSchema);
