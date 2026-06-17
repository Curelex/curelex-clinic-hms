import mongoose from 'mongoose';

const taskLogSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'Created', 'StatusChanged', 'FileUploaded'
  previousStatus: { type: String },
  newStatus: { type: String },
  details: { type: String },
}, { timestamps: true });

export default mongoose.model('TaskLog', taskLogSchema);
