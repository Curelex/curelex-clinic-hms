import AuditLog from '../models/ot/AuditLog.js';

export const logOTAction = async ({ entity, entityId, action, performedBy, details = {} }) => {
  try {
    await AuditLog.create({
      entity,
      entityId,
      action,
      performedBy,
      details
    });
  } catch (err) {
    console.error('Failed to write OT AuditLog:', err);
  }
};
