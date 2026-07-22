import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  entityType: { type: String, required: true }, // e.g. "OTBooking", "StaffAssignment", "PreOpAssessment"
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  
  action: { type: String, required: true }, // e.g. "CREATED", "UPDATED", "CANCELLED", "OVERRIDE"
  
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  timestamp: { type: Date, default: Date.now },
  
  details: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} } // Stores changes, old/new values, reasons
});

// Index for fast querying by entity
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
