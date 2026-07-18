import SurgeryRequest from '../models/ot/SurgeryRequest.js';
import { logOTAction } from '../utils/otAuditLogger.js';

export const getSurgeryRequests = async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { status } = req.query;
    
    const filter = { clinicId };
    if (status) filter.status = status;

    const requests = await SurgeryRequest.find(filter)
      .populate('patientId', 'name patientId phone')
      .populate('requestedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching surgery requests' });
  }
};

export const createSurgeryRequest = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { patientId, contextId, contextType, diagnosis, proposedProcedure, priority, notes } = req.body;

    const request = await SurgeryRequest.create({
      clinicId,
      patientId,
      requestedBy: userId,
      contextId,
      contextType,
      diagnosis,
      proposedProcedure,
      priority,
      notes
    });

    await logOTAction({
      entity: 'SurgeryRequest',
      entityId: request._id,
      action: 'CREATED',
      performedBy: userId,
      details: { diagnosis, proposedProcedure, priority }
    });

    // Populate for response
    const populated = await SurgeryRequest.findById(request._id)
      .populate('patientId', 'name patientId')
      .populate('requestedBy', 'name role');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Error creating surgery request', error: err.message });
  }
};

export const updateSurgeryRequestStatus = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { id } = req.params;
    const { status } = req.body; // pending, approved, scheduled, rejected, completed

    const existingRequest = await SurgeryRequest.findOne({ _id: id, clinicId });
    if (!existingRequest) return res.status(404).json({ message: 'Request not found' });

    const validTransitions = {
      'pending': ['approved', 'rejected'],
      'approved': ['scheduled', 'pending', 'rejected'],
      'scheduled': ['completed', 'approved', 'rejected'],
      'rejected': ['pending'],
      'completed': []
    };

    if (existingRequest.status !== status && !validTransitions[existingRequest.status]?.includes(status)) {
      return res.status(400).json({ message: `Cannot transition surgery request from ${existingRequest.status} to ${status}` });
    }

    existingRequest.status = status;
    await existingRequest.save();

    const request = await SurgeryRequest.findById(id).populate('patientId', 'name').populate('requestedBy', 'name');

    await logOTAction({
      entity: 'SurgeryRequest',
      entityId: request._id,
      action: 'STATUS_CHANGED',
      performedBy: userId,
      details: { status }
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Error updating request' });
  }
};
