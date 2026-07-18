import mongoose from 'mongoose';

const PreOpAssessmentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTBooking', required: true, unique: true },
  
  asaScore: { 
    type: String, 
    enum: ['I', 'II', 'III', 'IV', 'V', 'VI'], 
    required: false 
  },
  
  pacNotes: { type: String }, // Pre-Anesthesia Checkup notes
  
  investigationsReviewed: [{ type: String }], // Array of strings (e.g. ['ECG', 'CBC', 'CXR'])
  
  fitForSurgery: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('PreOpAssessment', PreOpAssessmentSchema);
