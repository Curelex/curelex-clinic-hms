import PostOpRecord from '../models/ot/PostOpRecord.js';
import OTBooking from '../models/ot/OTBooking.js';
import SurgeryRequest from '../models/ot/SurgeryRequest.js';
import Admission from '../models/Admission.js';
import { logOTAction } from '../utils/otAuditLogger.js';

export const getPostOp = async (req, res) => {
  try {
    const { id } = req.params;
    let postop = await PostOpRecord.findOne({ bookingId: id });
    if (!postop) {
      postop = await PostOpRecord.create({ bookingId: id });
    }
    res.json(postop);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching post-op record' });
  }
};

export const addVital = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    const { bp, pulse, spo2, consciousness } = req.body;

    const postop = await PostOpRecord.findOneAndUpdate(
      { bookingId: id },
      { $push: { vitals: { bp, pulse, spo2, consciousness, timestamp: new Date() } } },
      { new: true, upsert: true }
    );

    await logOTAction({
      entity: 'PostOpRecord',
      entityId: postop._id,
      action: 'VITAL_ADDED',
      performedBy: userId,
      details: { bp, pulse, spo2, consciousness }
    });

    res.json(postop);
  } catch (err) {
    res.status(500).json({ message: 'Error adding vital' });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { clinicId, id: userId, name: userName } = req.user;
    const { id } = req.params;
    const { status, notes } = req.body; // 'in_recovery', 'stable', 'ready_for_transfer', 'transferred'

    const existingRecord = await PostOpRecord.findOne({ bookingId: id });
    const currentStatus = existingRecord ? existingRecord.status : 'in_recovery';

    const validTransitions = {
      'in_recovery': ['stable'],
      'stable': ['ready_for_transfer'],
      'ready_for_transfer': ['transferred'],
      'transferred': []
    };

    if (currentStatus !== status && !validTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({ message: `Cannot transition post-op status from ${currentStatus} to ${status}` });
    }

    let updatePayload = { status, notes };
    if (status === 'transferred') {
      updatePayload.dischargeTime = new Date();
    }
    if (status === 'in_recovery') {
      updatePayload.pacuAdmitTime = new Date();
    }

    const postop = await PostOpRecord.findOneAndUpdate(
      { bookingId: id },
      updatePayload,
      { new: true, upsert: true }
    );

    await logOTAction({
      entity: 'PostOpRecord',
      entityId: postop._id,
      action: 'STATUS_CHANGED',
      performedBy: userId,
      details: { status, notes }
    });

    // ── Phase 5 Integration: Update IPD/Ward if transferred ──
    if (status === 'transferred') {
      const booking = await OTBooking.findById(id).populate('requestId');
      if (booking && booking.requestId && booking.requestId.contextType === 'Admission') {
        const admissionId = booking.requestId.contextId;
        await Admission.findByIdAndUpdate(admissionId, {
          $push: {
            followupLog: {
              note: `[OT Transfer] Patient transferred out of PACU/OT. Notes: ${notes || 'None'}`,
              type: 'Nurse',
              writtenBy: userId,
              writtenByName: userName,
              writtenAt: new Date()
            }
          }
        });

        if (req.io) {
          req.io.to(`clinic_${clinicId}_ward`).emit('notification', { 
            message: `Patient from OT (${booking.requestId.proposedProcedure}) has been transferred back to the ward.` 
          });
        }
      }
    }

    res.json(postop);
  } catch (err) {
    res.status(500).json({ message: 'Error updating post-op status' });
  }
};
