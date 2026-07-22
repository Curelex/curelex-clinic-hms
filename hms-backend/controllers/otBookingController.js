import OTBooking from '../models/ot/OTBooking.js';
import OTRoom from '../models/ot/OTRoom.js';
import StaffAssignment from '../models/ot/StaffAssignment.js';
import SurgeryRequest from '../models/ot/SurgeryRequest.js';
import PreOpAssessment from '../models/ot/PreOpAssessment.js';
import SafetyChecklist from '../models/ot/SafetyChecklist.js';
import { logOTAction } from '../utils/otAuditLogger.js';
import otBillingService from '../services/otBillingService.js';

// Conflict Engine
export const checkConflicts = async (clinicId, otRoomId, scheduledStart, scheduledEnd, bookingId = null, staffAssignments = []) => {
  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  // 1. Check OT Room double-booking
  const roomConflictQuery = {
    clinicId,
    otRoomId,
    status: { $nin: ['cancelled', 'completed', 'postponed'] },
    $or: [
      { scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } }
    ]
  };
  if (bookingId) roomConflictQuery._id = { $ne: bookingId };

  const roomConflict = await OTBooking.findOne(roomConflictQuery);
  if (roomConflict) {
    return { hasConflict: true, message: 'Operation Theatre is already booked during this time window.' };
  }

  // 2. Check Staff double-booking (Surgeon / Anesthetist etc.)
  if (staffAssignments && staffAssignments.length > 0) {
    const staffIds = staffAssignments.map(s => s.staffId);
    
    // Find any overlapping bookings for this clinic
    const overlappingBookings = await OTBooking.find({
      clinicId,
      status: { $nin: ['cancelled', 'completed', 'postponed'] },
      $or: [
        { scheduledStart: { $lt: end }, scheduledEnd: { $gt: start } }
      ],
      ...(bookingId && { _id: { $ne: bookingId } })
    }).select('_id');

    if (overlappingBookings.length > 0) {
      const overlappingBookingIds = overlappingBookings.map(b => b._id);
      
      const staffConflict = await StaffAssignment.findOne({
        bookingId: { $in: overlappingBookingIds },
        staffId: { $in: staffIds }
      }).populate('staffId', 'name');

      if (staffConflict) {
        return { 
          hasConflict: true, 
          message: `Staff member ${staffConflict.staffId?.name || 'Unknown'} is already assigned to another surgery during this time.` 
        };
      }
    }
  }

  return { hasConflict: false };
};

export const getBookings = async (req, res) => {
  try {
    const { clinicId, role, id: userId } = req.user;
    const { otRoomId, status, startDate, endDate } = req.query;

    let filter = { clinicId };
    if (otRoomId) filter.otRoomId = otRoomId;
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.scheduledStart = { $gte: new Date(startDate) };
      filter.scheduledEnd = { $lte: new Date(endDate) };
    }

    // Role-scoped view
    if (role !== 'super_admin' && role !== 'admin') {
      const myAssignments = await StaffAssignment.find({ staffId: userId }).select('bookingId');
      const myBookingIds = myAssignments.map(a => a.bookingId);
      filter._id = { $in: myBookingIds };
    }

    const bookings = await OTBooking.find(filter)
      .populate({
        path: 'requestId',
        populate: { path: 'patientId', select: 'name patientId' }
      })
      .populate('otRoomId', 'name location')
      .sort({ scheduledStart: 1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { requestId, otRoomId, scheduledStart, scheduledEnd, notes, staffAssignments } = req.body;

    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      return res.status(400).json({ message: 'Scheduled End time must be after Start time.' });
    }
    if (new Date(scheduledStart) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      return res.status(400).json({ message: 'Cannot schedule surgeries more than 30 days in the past.' });
    }

    // Run Conflict Engine
    const conflict = await checkConflicts(clinicId, otRoomId, scheduledStart, scheduledEnd, null, staffAssignments);
    if (conflict.hasConflict) {
      return res.status(409).json({ message: conflict.message });
    }

    const booking = await OTBooking.create({
      clinicId,
      requestId,
      otRoomId,
      scheduledStart,
      scheduledEnd,
      status: 'scheduled',
      notes
    });

    // Update Request status
    await SurgeryRequest.findByIdAndUpdate(requestId, { status: 'scheduled' });

    // Handle initial staff assignments if passed
    if (staffAssignments && staffAssignments.length > 0) {
      const staffIds = staffAssignments.map(s => String(s.staffId));
      const uniqueStaffIds = new Set(staffIds);
      if (uniqueStaffIds.size !== staffIds.length) {
        return res.status(400).json({ message: 'A staff member cannot be assigned multiple roles in the same surgery.' });
      }

      const assignmentsToInsert = staffAssignments.map(s => ({
        bookingId: booking._id,
        staffId: s.staffId,
        role: s.role
      }));
      await StaffAssignment.insertMany(assignmentsToInsert);
    }

    await logOTAction({
      entityType: 'OTBooking',
      entityId: booking._id,
      action: 'CREATED',
      actor: userId,
      details: { otRoomId, scheduledStart, scheduledEnd, staffAssignments }
    });

    // Notifications logic (via req.io if available)
    if (req.io) {
      req.io.to(`clinic_${clinicId}_staff`).emit('ot:booking-created', booking);
      if (staffAssignments) {
        staffAssignments.forEach(sa => {
          req.io.to(`doctor_${sa.staffId}`).emit('notification', { message: `You have been assigned to a new surgery on ${new Date(scheduledStart).toLocaleDateString()}` });
        });
      }
    }

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error creating booking', error: err.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { id } = req.params;
    const { status, override } = req.body;

    // console.log(`🔄 Updating booking ${id} status to: ${status}`);

    const booking = await OTBooking.findOne({ _id: id, clinicId });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Valid transitions
    const validTransitions = {
      'scheduled': ['confirmed', 'cancelled', 'postponed'],
      'confirmed': ['in_progress', 'cancelled', 'postponed'],
      'postponed': ['scheduled', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ message: `Cannot transition from ${booking.status} to ${status}` });
    }

    // Phase 4: Enforce Pre-Op checks before 'in_progress'
    if (status === 'in_progress' && !override) {
      const preop = await PreOpAssessment.findOne({ bookingId: id });
      const signInChecklist = await SafetyChecklist.findOne({ bookingId: id, stage: 'sign_in' });
      
      const isFit = preop && preop.fitForSurgery === true;
      const hasSignIn = signInChecklist && signInChecklist.items && signInChecklist.items.size > 0;

      if (!isFit || !hasSignIn) {
        const missing = [];
        if (!isFit) missing.push('Pre-op assessment not marked Fit for Surgery');
        if (!hasSignIn) missing.push('Sign-in checklist empty');
        return res.status(403).json({ 
          message: `Mandatory pre-op steps missing:\n- ${missing.join('\n- ')}`,
          requiresOverride: true 
        });
      }
    }

    if (status === 'in_progress' && override) {
      
      const role = req.user.role;
      
      if (role !== 'super_admin' || role !== 'admin') {
        return res.status(403).json({ message: 'Only administrators can override mandatory safety protocols.' });
      }

      await logOTAction({
        entityType: 'OTBooking',
        entityId: booking._id,
        action: 'OVERRIDE_PREOP',
        actor: userId,
        details: { reason: 'Transition to in_progress forced without complete pre-op.' }
      });
    }

    const oldStatus = booking.status;
    booking.status = status;
    await booking.save();

    // ── PHASE 6: Auto-billing on completion ──
    if (status === 'completed') {
      await SurgeryRequest.findByIdAndUpdate(booking.requestId, { status: 'completed' });
      
      // ── ADD OT CHARGES TO BILL ──
      try {
        // console.log(`💰 Attempting to add OT charges for booking: ${id}`);
        const { bill, charges } = await otBillingService.addOTToBill(id);
        // console.log(`✅ OT charges added to bill: ₹${charges.total}, Bill ID: ${bill.billId}`);
        
        // Send notification via socket
        if (req.io) {
          req.io.to(`clinic_${clinicId}_staff`).emit('ot:billing-completed', {
            bookingId: id,
            total: charges.total,
            billId: bill.billId
          });
        }
      } catch (billingErr) {
        console.error('❌ Failed to add OT billing:', billingErr);
        // Don't fail the status update, just log error
      }
    } else if (status === 'cancelled') {
      await SurgeryRequest.findByIdAndUpdate(booking.requestId, { status: 'approved' });
      
      // ── Remove OT charges from bill if cancelled ──
      try {
        await otBillingService.removeOTFromBill(id);
        // console.log(`✅ OT charges removed from bill for cancelled booking`);
      } catch (billingErr) {
        console.error('❌ Failed to remove OT billing:', billingErr);
      }
    }

    await logOTAction({
      entityType: 'OTBooking',
      entityId: booking._id,
      action: 'STATUS_CHANGED',
      actor: userId,
      details: { status, oldStatus }
    });

    if (req.io) {
      req.io.to(`clinic_${clinicId}_staff`).emit('ot:booking-updated', booking);
    }

    res.json(booking);
  } catch (err) {
    console.error('Update booking status error:', err);
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

export const getAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const assignments = await StaffAssignment.find({ bookingId: id }).populate('staffId', 'name role');
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching assignments' });
  }
};

export const updateAssignments = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { id: bookingId } = req.params;
    const { assignments } = req.body; // Array of { staffId, role }

    const booking = await OTBooking.findOne({ _id: bookingId, clinicId });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Check staff availability for new assignments
    const conflict = await checkConflicts(clinicId, booking.otRoomId, booking.scheduledStart, booking.scheduledEnd, bookingId, assignments);
    if (conflict.hasConflict) {
      return res.status(409).json({ message: conflict.message });
    }

    // Get old assignments for audit logging
    const oldAssignments = await StaffAssignment.find({ bookingId });
    
    // Replace all assignments
    await StaffAssignment.deleteMany({ bookingId });
    
    if (assignments && assignments.length > 0) {
      const staffIds = assignments.map(a => String(a.staffId));
      const uniqueStaffIds = new Set(staffIds);
      if (uniqueStaffIds.size !== staffIds.length) {
        return res.status(400).json({ message: 'A staff member cannot be assigned multiple roles in the same surgery.' });
      }

      const toInsert = assignments.map(a => ({
        bookingId,
        staffId: a.staffId,
        role: a.role
      }));
      await StaffAssignment.insertMany(toInsert);
    }

    await logOTAction({
      entityType: 'StaffAssignment',
      entityId: booking._id,
      action: 'REASSIGNED',
      actor: userId,
      details: {
        oldAssignments: oldAssignments.map(o => ({ staffId: o.staffId, role: o.role })),
        newAssignments: assignments
      }
    });

    res.json({ message: 'Assignments updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating assignments' });
  }
};
