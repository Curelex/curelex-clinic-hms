import AuditLog from '../models/ot/AuditLog.js';

export const logOTAction = async ({ entityType, entityId, action, actor, details = {} }) => {
  try {
    await AuditLog.create({
      entityType,
      entityId,
      action,
      actor,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to write OT AuditLog:', err);
  }
};
