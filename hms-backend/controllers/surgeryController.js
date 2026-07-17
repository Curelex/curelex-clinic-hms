import Surgery from '../models/Surgery.js';
import mongoose from 'mongoose';

// Standard Pre-op checklist
const STANDARD_PREOP_CHECKLIST = [
  { task: 'Fasting complete', isCompleted: false },
  { task: 'Consent signed', isCompleted: false },
  { task: 'Vitals stable', isCompleted: false },
  { task: 'Site marked', isCompleted: false },
  { task: 'Allergies checked', isCompleted: false },
];

/**
 * Check for scheduling conflicts
 */
const checkConflicts = async (clinicId, operationTheatreNum, surgeonId, anesthetistId, startTime, endTime, excludeSurgeryId = null) => {
  const query = {
    clinicId,
    status: { $in: ['Scheduled', 'In-Progress'] },
    $or: [
      { operationTheatreNum },
      { surgeonId },
    ],
    // Overlap logic: existing start < new end AND existing end > new start
    startTime: { $lt: endTime },
    endTime: { $gt: startTime }
  };

  if (anesthetistId) {
    query.$or.push({ anesthetistId });
  }

  if (excludeSurgeryId) {
    query._id = { $ne: excludeSurgeryId };
  }

  const conflict = await Surgery.findOne(query).populate('surgeonId anesthetistId');
  if (conflict) {
    let reason = 'Time slot conflicts with another surgery.';
    if (conflict.operationTheatreNum === operationTheatreNum) {
      reason = `Operation Theatre ${operationTheatreNum} is already booked for this time.`;
    } else if (conflict.surgeonId && String(conflict.surgeonId._id) === String(surgeonId)) {
      reason = `Surgeon is already booked for another surgery at this time.`;
    } else if (anesthetistId && conflict.anesthetistId && String(conflict.anesthetistId._id) === String(anesthetistId)) {
      reason = `Anesthetist is already booked for another surgery at this time.`;
    }
    return reason;
  }
  return null;
};

// @desc    Create new surgery
// @route   POST /api/surgeries
// @access  Private (Admin/Doctor)
export const createSurgery = async (req, res) => {
  try {
    const { patientId, surgeryName, operationTheatreNum, startTime, endTime, surgeonId, anesthetistId } = req.body;
    const clinicId = req.user.clinicId || req.user.clinic; // Assuming clinicId is available on req.user

    if (!clinicId) {
      return res.status(400).json({ message: 'Clinic ID is required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ message: 'End time must be after start time.' });
    }

    // Check for conflicts
    const conflictReason = await checkConflicts(clinicId, operationTheatreNum, surgeonId, anesthetistId, start, end);
    if (conflictReason) {
      return res.status(409).json({ message: conflictReason });
    }

    const surgery = new Surgery({
      clinicId,
      patientId,
      surgeryName,
      operationTheatreNum,
      startTime: start,
      endTime: end,
      surgeonId,
      anesthetistId: anesthetistId || undefined,
      preOpChecklist: [...STANDARD_PREOP_CHECKLIST], // initialize with standard checklist
      createdBy: req.user.id
    });

    await surgery.save();
    res.status(201).json(surgery);
  } catch (error) {
    console.error('Error creating surgery:', error);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: `Validation Error: ${error.message}` });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all surgeries
// @route   GET /api/surgeries
// @access  Private
export const getSurgeries = async (req, res) => {
  try {
    const clinicId = req.user.clinicId || req.user.clinic;
    const { startDate, endDate, status } = req.query;

    const query = { clinicId };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    if (status) {
      query.status = status;
    }

    const surgeries = await Surgery.find(query)
      .populate('patientId', 'name patientId')
      .populate('surgeonId', 'name')
      .populate('anesthetistId', 'name')
      .sort({ startTime: 1 });

    res.json(surgeries);
  } catch (error) {
    console.error('Error getting surgeries:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update surgery status and details
// @route   PUT /api/surgeries/:id
// @access  Private (Admin/Doctor)
export const updateSurgery = async (req, res) => {
  try {
    const { status, startTime, endTime, operationTheatreNum, surgeonId, anesthetistId } = req.body;
    const surgeryId = req.params.id;
    const clinicId = req.user.clinicId || req.user.clinic;

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) {
      return res.status(404).json({ message: 'Surgery not found' });
    }

    // Status transition validation
    if (status && status !== surgery.status) {
      const validTransitions = {
        'Scheduled': ['In-Progress', 'Cancelled'],
        'In-Progress': ['Completed', 'Cancelled'],
        'Completed': [],
        'Cancelled': []
      };

      if (!validTransitions[surgery.status].includes(status)) {
        return res.status(400).json({ message: `Invalid status transition from ${surgery.status} to ${status}` });
      }
      surgery.status = status;
    }

    // Update times/location/doctors and check conflicts if changed and not completed/cancelled
    let checkConflictNeeded = false;
    const newStart = startTime ? new Date(startTime) : surgery.startTime;
    const newEnd = endTime ? new Date(endTime) : surgery.endTime;
    const newOT = operationTheatreNum || surgery.operationTheatreNum;
    const newSurgeon = surgeonId || surgery.surgeonId;
    const newAnesthetist = anesthetistId !== undefined ? anesthetistId : surgery.anesthetistId;

    if (startTime || endTime || operationTheatreNum || surgeonId || anesthetistId !== undefined) {
      if (surgery.status === 'Scheduled' || surgery.status === 'In-Progress') {
        checkConflictNeeded = true;
      }
    }

    if (checkConflictNeeded) {
      if (newStart >= newEnd) {
        return res.status(400).json({ message: 'End time must be after start time.' });
      }
      const conflictReason = await checkConflicts(clinicId, newOT, newSurgeon, newAnesthetist, newStart, newEnd, surgeryId);
      if (conflictReason) {
        return res.status(409).json({ message: conflictReason });
      }
      surgery.startTime = newStart;
      surgery.endTime = newEnd;
      surgery.operationTheatreNum = newOT;
      surgery.surgeonId = newSurgeon;
      surgery.anesthetistId = newAnesthetist;
    }

    surgery.updatedBy = req.user._id;
    await surgery.save();
    res.json(surgery);
  } catch (error) {
    console.error('Error updating surgery:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update Pre-op checklist
// @route   PUT /api/surgeries/:id/preop
// @access  Private (Admin/Doctor/Nurse)
export const updatePreOpChecklist = async (req, res) => {
  try {
    const { checklist } = req.body; // Array of { task, isCompleted }
    const surgeryId = req.params.id;

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });

    // Update or add new tasks
    checklist.forEach(item => {
      const existing = surgery.preOpChecklist.find(c => c.task === item.task);
      if (existing) {
        // Only update completed stats if status changed
        if (existing.isCompleted !== item.isCompleted) {
          existing.isCompleted = item.isCompleted;
          if (item.isCompleted) {
            existing.completedBy = req.user._id;
            existing.completedAt = new Date();
          } else {
            existing.completedBy = null;
            existing.completedAt = null;
          }
        }
      } else {
        // New custom task
        surgery.preOpChecklist.push({
          task: item.task,
          isCompleted: item.isCompleted,
          completedBy: item.isCompleted ? req.user._id : null,
          completedAt: item.isCompleted ? new Date() : null
        });
      }
    });

    surgery.updatedBy = req.user._id;
    await surgery.save();
    res.json(surgery);
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update Post-op recovery (vitals, notes)
// @route   PUT /api/surgeries/:id/postop
// @access  Private (Admin/Doctor/Nurse)
export const updatePostOpRecovery = async (req, res) => {
  try {
    const { notes, condition, vital } = req.body;
    const surgeryId = req.params.id;

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });

    if (notes !== undefined) surgery.postOpRecovery.notes = notes;
    if (condition !== undefined) surgery.postOpRecovery.condition = condition;
    
    if (vital) {
      // Vital validation based on schema is done by mongoose, 
      // but we add it to the array
      surgery.postOpRecovery.vitals.push({
        ...vital,
        timestamp: new Date(),
        recordedBy: req.user._id
      });
    }

    surgery.updatedBy = req.user._id;
    await surgery.save(); // Mongoose will run validation on vitals array here
    res.json(surgery);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    console.error('Error updating post-op:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload Consent Form
// @route   POST /api/surgeries/:id/consent
// @access  Private
export const uploadConsentForm = async (req, res) => {
  try {
    const surgeryId = req.params.id;
    const { documentName } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const surgery = await Surgery.findById(surgeryId);
    if (!surgery) return res.status(404).json({ message: 'Surgery not found' });

    surgery.consentForms.push({
      documentName: documentName || req.file.originalname,
      fileUrl: `/uploads/surgeries/${req.file.filename}`,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    });

    surgery.updatedBy = req.user._id;
    await surgery.save();
    res.json(surgery);
  } catch (error) {
    console.error('Error uploading consent form:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
