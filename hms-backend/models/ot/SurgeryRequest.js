import mongoose from 'mongoose';

const SurgeryRequestSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contextId: { type: mongoose.Schema.Types.ObjectId }, // Can refer to Admission or Appointment
  contextType: { type: String, enum: ['Admission', 'Appointment', 'None'], default: 'None' },
  
  diagnosis: { type: String, required: true },
  proposedProcedure: { type: String, required: true },
  priority: { type: String, enum: ['elective', 'urgent', 'emergency'], default: 'elective' },
  
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'scheduled', 'rejected', 'completed'], 
    default: 'pending' 
  },
  
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model('SurgeryRequest', SurgeryRequestSchema);
