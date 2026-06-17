import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['Received', 'In Process', 'Completed'], default: 'Received' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedRole: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clinicId: { type: String, required: true, index: true },
  completionNote: { type: String },
  completionFiles: [String],
  taskFiles: [String] // Files attached during creation
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);
