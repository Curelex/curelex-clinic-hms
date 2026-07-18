import mongoose from 'mongoose';

const ConsentFormSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'OTBooking', required: true, index: true },
  
  templateId: { type: String, required: true }, // e.g. "general_surgery_consent", "anesthesia_consent"
  
  patientSignatureUrl: { type: String }, // Path to the uploaded signature or signed PDF
  relativeSignatureUrl: { type: String }, // Path for guardian/relative signature if applicable
  
  signedAt: { type: Date },
  language: { type: String, default: 'en' }
}, { timestamps: true });

export default mongoose.model('ConsentForm', ConsentFormSchema);
