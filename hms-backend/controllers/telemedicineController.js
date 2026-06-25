// hms-backend/controllers/telemedicineController.js

import Telemedicine from '../models/Telemedicine.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

// ── Helper: Generate meeting link ──
function generateMeetingLink(meetingId) {
  return `https://meet.curelex.com/${meetingId}`;
}

function generateMeetingId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ── Helper: Calculate fees (0% commission) ──
function calculateFees(consultationFee, commissionPercentage = 0) {
  const clinicCommission = (consultationFee * commissionPercentage) / 100;
  const doctorFee = consultationFee - clinicCommission;
  return { doctorFee, clinicCommission };
}


export const requestTelemedicine = async (req, res) => {
  try {
    const { patientId, doctorId, symptoms, preferredTime, urgency } = req.body;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    // ── FIX: Find the patient by their User ID (req.user.id) ──
    // The patient is logged in, so we should use the logged-in user's ID
    // to find the patient record, not the patientId from the request body
    const patient = await Patient.findOne({ userId: req.user.id, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const doctor = await User.findOne({ _id: doctorId, clinicId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    if (!doctor.isActive) {
      return res.status(400).json({ success: false, message: 'Doctor is not available' });
    }

    // Check if doctor has bank details
    if (!doctor.bankDetails || !doctor.bankDetails.accountNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Doctor has not set up payment details yet. Please contact the clinic.' 
      });
    }

    const isDoctorOnline = global.doctorStatus?.get(doctorId)?.status === 'online';

    // ── Use the patient's _id from the Patient collection ──
    const telemedicine = await Telemedicine.create({
      patientId: patient._id, // ← This is the Patient collection ID (6a38bc32754185ed9f16daba)
      patientUserId: req.user.id, // ← User._id used for socket room (patient_<userId>)
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      doctorId: doctor._id,
      doctorName: doctor.name,
      doctorSpecialization: doctor.department || doctor.specialization,
      clinicId,
      symptoms: symptoms || '',
      preferredTime: preferredTime || null,
      urgency: urgency || 'normal',
      consultationFee: doctor.consultationFee || 0,
      status: 'requested',
      paymentStatus: 'pending',
      doctorPayoutStatus: 'pending',
    });

    // ── Create notification for doctor ──
    await Notification.create({
      userId: doctor._id,
      message: `🩺 New telemedicine request from ${patient.name}${urgency === 'urgent' ? ' (URGENT)' : urgency === 'emergency' ? ' 🚨 EMERGENCY' : ''}`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    // ── Socket.IO: Notify doctor ──
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${doctorId}`).emit('telemedicine:new-request', {
        requestId: telemedicine._id,
        patientId: patient._id, // ← Send the Patient collection ID
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        symptoms: symptoms || '',
        urgency: urgency || 'normal',
        consultationFee: doctor.consultationFee || 0,
        timestamp: new Date(),
        message: `📱 New telemedicine request from ${patient.name}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Telemedicine request sent successfully',
      telemedicine,
      doctorAvailable: isDoctorOnline
    });
  } catch (error) {
    console.error('Request telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ── 2. Doctor approves request (creates payment requirement) ──
export const approveTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime, doctorNotes } = req.body;
    const clinicId = req.user?.clinicId;
    const doctorId = req.user.id;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    telemedicine.status = 'payment_pending';
    telemedicine.scheduledTime = scheduledTime || new Date(Date.now() + 30 * 60000);
    telemedicine.doctorNotes = doctorNotes || '';
    await telemedicine.save();

    await Notification.create({
      userId: telemedicine.patientId,
      message: `💳 Payment required: Dr. ${telemedicine.doctorName} has approved your request. Please pay ₹${telemedicine.consultationFee} to confirm.`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:payment-required', {
        requestId: telemedicine._id,
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        consultationFee: telemedicine.consultationFee,
        scheduledTime: telemedicine.scheduledTime,
        timestamp: new Date(),
        message: `💳 Payment required: ₹${telemedicine.consultationFee}`
      });
    }

    res.json({
      success: true,
      message: 'Telemedicine approved. Payment required from patient.',
      telemedicine,
    });
  } catch (error) {
    console.error('Approve telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentDetails } = req.body;
    const clinicId = req.user?.clinicId;
    const userId = req.user.id;

    console.log('💳 ===== PAYMENT REQUEST RECEIVED =====');
    console.log('  - Request ID:', id);
    console.log('  - User ID:', userId);
    console.log('  - Clinic ID:', clinicId);

    // Find the telemedicine request
    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      console.log('❌ Request not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Request not found' 
      });
    }
    console.log('✅ Found telemedicine request');

    // ── Get the patient from the logged-in user ──
    const patient = await Patient.findOne({ userId: userId, clinicId });
    if (!patient) {
      console.log('❌ Patient not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Patient profile not found' 
      });
    }

    // ── Check authorization ──
    const requestPatientId = String(telemedicine.patientId);
    const loggedInPatientId = String(patient._id);
    
    console.log('🔍 Payment Authorization Check:');
    console.log('  - Request Patient ID:', requestPatientId);
    console.log('  - Logged-in Patient ID:', loggedInPatientId);
    console.log('  - Telemedicine Status:', telemedicine.status);

    if (requestPatientId !== loggedInPatientId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this request'
      });
    }

    if (telemedicine.status !== 'payment_pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Payment not required. Current status: ${telemedicine.status}` 
      });
    }

    // ── Calculate fees ──
    const { doctorFee, clinicCommission } = calculateFees(telemedicine.consultationFee, 0);
    console.log('💰 Fees calculated - Doctor:', doctorFee, 'Clinic:', clinicCommission);

    // ── Create transaction record ──
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log('📝 Creating transaction:', transactionId);

    const transaction = new Transaction({
      patientId: telemedicine.patientId,
      doctorId: telemedicine.doctorId,
      clinicId: telemedicine.clinicId,
      telemedicineId: telemedicine._id,
      amount: telemedicine.consultationFee,
      doctorFee: doctorFee,
      clinicCommission: clinicCommission,
      commissionPercentage: 0,
      paymentMethod: paymentMethod || 'mock',
      paymentGateway: 'mock',
      paymentDetails: paymentDetails || {},
      paidAt: new Date(),
      paymentStatus: 'paid',
      payoutStatus: 'pending',
      transactionId: transactionId,
    });

    await transaction.save();
    console.log('✅ Transaction saved');

    // ── Update telemedicine ──
    telemedicine.status = 'payment_completed';
    telemedicine.paymentStatus = 'paid';
    telemedicine.paymentMethod = paymentMethod || 'mock';
    telemedicine.transactionId = transactionId;
    telemedicine.paymentDetails = paymentDetails || {};
    telemedicine.paidAt = new Date();
    telemedicine.doctorPayoutAmount = doctorFee;
    telemedicine.clinicCommissionAmount = clinicCommission;
    telemedicine.doctorPayoutStatus = 'pending';
    await telemedicine.save();
    console.log('✅ Telemedicine updated');

    // ── Generate meeting link ──
    const meetingId = generateMeetingId();
    const meetingLink = generateMeetingLink(meetingId);
    telemedicine.meetingId = meetingId;
    telemedicine.meetingLink = meetingLink;
    telemedicine.status = 'scheduled';
    await telemedicine.save();
    console.log('✅ Meeting link generated:', meetingLink);

    // ── Create notifications ──
    console.log('📝 Creating notifications...');
    await Notification.create({
      userId: telemedicine.doctorId,
      message: `✅ Payment received! Dr. ${telemedicine.doctorName}, you can now start the consultation.`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    await Notification.create({
      userId: telemedicine.patientId,
      message: `✅ Payment successful! Your consultation with Dr. ${telemedicine.doctorName} is confirmed. Meeting link: ${meetingLink}`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });
    console.log('✅ Notifications created');

    // ── Socket.IO: Notify both parties ──
    console.log('📤 Emitting socket events...');
    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:payment-success', {
        requestId: telemedicine._id,
        meetingLink: telemedicine.meetingLink,
        scheduledTime: telemedicine.scheduledTime,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: '✅ Payment successful! Consultation confirmed.'
      });

      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:payment-received', {
        requestId: telemedicine._id,
        patientName: telemedicine.patientName,
        doctorFee: doctorFee,
        timestamp: new Date(),
        message: `✅ Payment received ₹${telemedicine.consultationFee}`
      });
      console.log('✅ Socket events emitted');
    }

    console.log('✅ ===== PAYMENT PROCESSED SUCCESSFULLY =====');
    res.json({
      success: true,
      message: 'Payment processed successfully',
      telemedicine,
      transaction,
    });

  } catch (error) {
    console.error('❌ Process payment error:', error);
    console.error('  - Stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Payment processing failed' 
    });
  }
};
// ── 4. Doctor rejects request ──
export const rejectTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorNotes } = req.body;
    const clinicId = req.user?.clinicId;
    const doctorId = req.user.id;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    telemedicine.status = 'rejected';
    telemedicine.doctorNotes = doctorNotes || 'Doctor declined the request';
    await telemedicine.save();

    await Notification.create({
      userId: telemedicine.patientId,
      message: `❌ Your telemedicine request was declined by Dr. ${telemedicine.doctorName}`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'rejected',
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: `❌ Your request was declined by Dr. ${telemedicine.doctorName}`
      });
    }

    res.json({
      success: true,
      message: 'Telemedicine request rejected',
      telemedicine,
    });
  } catch (error) {
    console.error('Reject telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 5. Doctor starts meeting ──
export const startTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.user?.clinicId;
    const doctorId = req.user.id;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['scheduled', 'ready'].includes(telemedicine.status)) {
      return res.status(400).json({ success: false, message: 'Cannot start this meeting' });
    }

    if (telemedicine.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    telemedicine.status = 'ongoing';
    telemedicine.startedAt = new Date();
    await telemedicine.save();

    await Notification.create({
      userId: telemedicine.patientId,
      message: `🔴 Dr. ${telemedicine.doctorName} has started the meeting. Click to join!`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:meeting-started', {
        requestId: telemedicine._id,
        meetingLink: telemedicine.meetingLink,
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: `🔴 Meeting started by Dr. ${telemedicine.doctorName}`
      });

      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'ongoing',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Meeting started',
      telemedicine,
    });
  } catch (error) {
    console.error('Start telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 6. Doctor ends meeting ──
export const endTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorNotes } = req.body;
    const clinicId = req.user?.clinicId;
    const doctorId = req.user.id;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'ongoing') {
      return res.status(400).json({ success: false, message: 'Meeting is not active' });
    }

    const endedAt = new Date();
    const durationMinutes = Math.round((endedAt - telemedicine.startedAt) / 60000);

    telemedicine.status = 'completed';
    telemedicine.endedAt = endedAt;
    telemedicine.durationMinutes = durationMinutes;
    if (doctorNotes) telemedicine.doctorNotes = doctorNotes;
    await telemedicine.save();

    // Update transaction with duration
    await Transaction.findOneAndUpdate(
      { telemedicineId: telemedicine._id },
      { consultationDuration: durationMinutes, consultationDate: endedAt }
    );

    await Notification.create({
      userId: telemedicine.patientId,
      message: `✅ Meeting with Dr. ${telemedicine.doctorName} has ended. Duration: ${durationMinutes} minutes`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      io.to(`patient_${patientRoomId}`).emit('telemedicine:meeting-ended', {
        requestId: telemedicine._id,
        duration: durationMinutes,
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: `✅ Meeting ended. Duration: ${durationMinutes} minutes`
      });

      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'completed',
        duration: durationMinutes,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Meeting ended',
      telemedicine,
    });
  } catch (error) {
    console.error('End telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 7. Doctor requests payout ──
export const requestPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.user?.clinicId;
    const doctorId = req.user.id;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Consultation not completed' });
    }

    if (telemedicine.doctorPayoutStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    telemedicine.doctorPayoutStatus = 'processing';
    await telemedicine.save();

    await Transaction.findOneAndUpdate(
      { telemedicineId: telemedicine._id },
      { payoutStatus: 'processing' }
    );

    // Notify super_admin (not clinic admin) — payout approval is a super admin responsibility
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (superAdmin) {
      await Notification.create({
        userId: superAdmin._id,
        message: `💰 Payout requested: Dr. ${telemedicine.doctorName} is requesting ₹${telemedicine.doctorPayoutAmount}`,
        taskId: telemedicine._id,
        clinicId,
        read: false,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${doctorId}`).emit('telemedicine:payout-requested', {
        requestId: telemedicine._id,
        amount: telemedicine.doctorPayoutAmount,
        timestamp: new Date(),
        message: `💰 Payout requested: ₹${telemedicine.doctorPayoutAmount}`
      });
    }

    res.json({
      success: true,
      message: 'Payout request submitted',
      telemedicine,
    });
  } catch (error) {
    console.error('Request payout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 8. Super admin approves payout ──
export const approvePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { payoutId, payoutMethod, notes } = req.body;

    // super_admin has no clinicId — find by ID only
    const telemedicine = await Telemedicine.findById(id);
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (telemedicine.doctorPayoutStatus !== 'processing') {
      return res.status(400).json({ success: false, message: 'Payout not in processing state' });
    }

    telemedicine.doctorPayoutStatus = 'completed';
    telemedicine.payoutId = payoutId || `PAY-${Date.now()}`;
    await telemedicine.save();

    await Transaction.findOneAndUpdate(
      { telemedicineId: telemedicine._id },
      { 
        payoutStatus: 'completed',
        payoutId: payoutId || `PAY-${Date.now()}`,
        payoutDate: new Date(),
        payoutMethod: payoutMethod || 'bank_transfer',
        notes: notes || '',
      }
    );

    await Notification.create({
      userId: telemedicine.doctorId,
      message: `✅ Payout completed: ₹${telemedicine.doctorPayoutAmount} has been transferred to your account.`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:payout-approved', {
        requestId: telemedicine._id,
        amount: telemedicine.doctorPayoutAmount,
        timestamp: new Date(),
        message: `✅ Payout approved: ₹${telemedicine.doctorPayoutAmount}`
      });
    }

    res.json({
      success: true,
      message: 'Payout approved',
      telemedicine,
    });
  } catch (error) {
    console.error('Approve payout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.user?.clinicId;
    const userId = req.user.id;

    console.log('🔍 Cancel Request Debug:');
    console.log('  - Request ID:', id);
    console.log('  - User ID:', userId);
    console.log('  - User Role:', req.user?.role);

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    console.log('  - Telemedicine Patient ID:', telemedicine.patientId);
    console.log('  - Telemedicine Patient User ID:', telemedicine.patientUserId);
    console.log('  - Telemedicine Doctor ID:', telemedicine.doctorId);

    // ── FIX: Check if user is the doctor ──
    const isDoctor = String(telemedicine.doctorId) === String(userId);
    
    // ── FIX: Check if user is the patient ──
    let isPatient = false;
    
    // First check if patientUserId matches (this is the User ID we stored)
    if (telemedicine.patientUserId && String(telemedicine.patientUserId) === String(userId)) {
      isPatient = true;
      console.log('  - Patient matched via patientUserId');
    }
    
    // If not, check if the patientId matches the userId (Patient collection ID vs User ID)
    if (!isPatient && String(telemedicine.patientId) === String(userId)) {
      isPatient = true;
      console.log('  - Patient matched via patientId (direct match)');
    }
    
    // If still not, check if the user has a patient record with matching ID
    if (!isPatient) {
      const patient = await Patient.findOne({ userId: userId, clinicId });
      if (patient && String(patient._id) === String(telemedicine.patientId)) {
        isPatient = true;
        console.log('  - Patient matched via Patient lookup:', patient._id);
      }
    }

    console.log('  - isPatient:', isPatient);
    console.log('  - isDoctor:', isDoctor);

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to cancel this request' 
      });
    }

    // Check if the request can be cancelled
    const cancellableStatuses = ['requested', 'approved', 'scheduled', 'payment_pending'];
    if (!cancellableStatuses.includes(telemedicine.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot cancel this meeting. Current status: ${telemedicine.status}` 
      });
    }

    telemedicine.status = 'cancelled';
    await telemedicine.save();

    console.log('✅ Request cancelled successfully');

    // ── Notify the other party ──
    if (isPatient) {
      // Notify doctor
      await Notification.create({
        userId: telemedicine.doctorId,
        message: `❌ ${telemedicine.patientName} has cancelled the telemedicine consultation.`,
        taskId: telemedicine._id,
        clinicId,
        read: false,
      });
    } else {
      // Notify patient
      await Notification.create({
        userId: telemedicine.patientId,
        message: `❌ Dr. ${telemedicine.doctorName} has cancelled the telemedicine consultation.`,
        taskId: telemedicine._id,
        clinicId,
        read: false,
      });
    }

    // ── Socket.IO: Notify both parties ──
    const io = req.app.get('io');
    if (io) {
      const patientRoomId = telemedicine.patientUserId || telemedicine.patientId;
      
      io.to(`patient_${patientRoomId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'cancelled',
        timestamp: new Date(),
        message: isPatient ? '❌ You cancelled this consultation' : '❌ Doctor cancelled this consultation'
      });
      
      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'cancelled',
        timestamp: new Date(),
        message: isPatient ? '❌ Patient cancelled this consultation' : '❌ You cancelled this consultation'
      });
    }

    res.json({
      success: true,
      message: 'Telemedicine cancelled successfully',
      telemedicine,
    });
  } catch (error) {
    console.error('Cancel telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get doctor's telemedicine requests ──
export const getDoctorTelemedicine = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const clinicId = req.user?.clinicId;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { doctorId, clinicId };
    if (status) query.status = status;

    const total = await Telemedicine.countDocuments(query);
    const requests = await Telemedicine.find(query)
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId', 'name department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get doctor telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get patient's telemedicine requests ──
export const getPatientTelemedicine = async (req, res) => {
  try {
    const patientId = req.params.id;
    const clinicId = req.user?.clinicId;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { patientId, clinicId };
    if (status) query.status = status;

    const total = await Telemedicine.countDocuments(query);
    const requests = await Telemedicine.find(query)
      .populate('doctorId', 'name department')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get patient telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get single telemedicine request ──
export const getTelemedicineById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.user?.clinicId;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId })
      .populate('patientId', 'name patientId phone email')
      .populate('doctorId', 'name department');

    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, telemedicine });
  } catch (error) {
    console.error('Get telemedicine by id error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get telemedicine stats with earnings ──
export const getTelemedicineStats = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId;

    const [total, requested, approved, paymentPending, paymentCompleted, scheduled, ongoing, completed, cancelled, rejected] = await Promise.all([
      Telemedicine.countDocuments({ clinicId }),
      Telemedicine.countDocuments({ clinicId, status: 'requested' }),
      Telemedicine.countDocuments({ clinicId, status: 'approved' }),
      Telemedicine.countDocuments({ clinicId, status: 'payment_pending' }),
      Telemedicine.countDocuments({ clinicId, status: 'payment_completed' }),
      Telemedicine.countDocuments({ clinicId, status: 'scheduled' }),
      Telemedicine.countDocuments({ clinicId, status: 'ongoing' }),
      Telemedicine.countDocuments({ clinicId, status: 'completed' }),
      Telemedicine.countDocuments({ clinicId, status: 'cancelled' }),
      Telemedicine.countDocuments({ clinicId, status: 'rejected' }),
    ]);

    // Get earnings stats
    const earningsStats = await Transaction.aggregate([
      { $match: { clinicId: new mongoose.Types.ObjectId(clinicId) } },
      { $group: {
        _id: '$payoutStatus',
        total: { $sum: '$doctorFee' },
        count: { $sum: 1 }
      }}
    ]);

    const totalEarnings = earningsStats.reduce((sum, t) => sum + t.total, 0);
    const pendingPayouts = earningsStats.find(t => t._id === 'pending')?.total || 0;
    const processingPayouts = earningsStats.find(t => t._id === 'processing')?.total || 0;
    const completedPayouts = earningsStats.find(t => t._id === 'completed')?.total || 0;

    res.json({
      success: true,
      stats: {
        total,
        requested,
        approved,
        paymentPending,
        paymentCompleted,
        scheduled,
        ongoing,
        completed,
        cancelled,
        rejected,
        earnings: {
          total: totalEarnings,
          pending: pendingPayouts,
          processing: processingPayouts,
          completed: completedPayouts,
        }
      },
    });
  } catch (error) {
    console.error('Get telemedicine stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get doctor's earnings ──
export const getDoctorEarnings = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const clinicId = req.user?.clinicId;

    const transactions = await Transaction.aggregate([
      { 
        $match: { 
          doctorId: new mongoose.Types.ObjectId(doctorId), 
          clinicId: new mongoose.Types.ObjectId(clinicId) 
        } 
      },
      { $group: {
        _id: '$payoutStatus',
        total: { $sum: '$doctorFee' },
        count: { $sum: 1 }
      }}
    ]);

    const totalEarnings = transactions.reduce((sum, t) => sum + t.total, 0);
    const pendingPayouts = transactions.find(t => t._id === 'pending')?.total || 0;
    const processingPayouts = transactions.find(t => t._id === 'processing')?.total || 0;
    const completedPayouts = transactions.find(t => t._id === 'completed')?.total || 0;

    // Get recent transactions
    const recentTransactions = await Transaction.find({
      doctorId,
      clinicId
    })
    .populate('patientId', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      earnings: {
        total: totalEarnings,
        pending: pendingPayouts,
        processing: processingPayouts,
        completed: completedPayouts,
        breakdown: transactions
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Get doctor earnings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get pending payouts (super_admin only) ──
export const getPendingPayouts = async (req, res) => {
  try {
    // super_admin has no clinicId — fetch all pending payouts across all clinics
    const pendingPayouts = await Telemedicine.find({
      doctorPayoutStatus: 'processing',
      status: 'completed'
    })
    .populate('doctorId', 'name email phone bankDetails')
    .populate('patientId', 'name email phone')
    .sort({ createdAt: 1 });

    const totalAmount = pendingPayouts.reduce((sum, item) => sum + (item.doctorPayoutAmount || 0), 0);

    res.json({
      success: true,
      pendingPayouts,
      totalAmount,
      count: pendingPayouts.length
    });
  } catch (error) {
    console.error('Get pending payouts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get online doctors ──
export const getOnlineDoctors = async (req, res) => {
  try {
    const { clinicId } = req.query;
    
    if (!global.doctorStatus) {
      return res.json({ success: true, onlineDoctors: [] });
    }
    
    const onlineDoctors = [];
    for (const [doctorId, data] of global.doctorStatus.entries()) {
      if (data.status === 'online' && data.clinicId === clinicId) {
        onlineDoctors.push({
          doctorId,
          lastSeen: data.lastSeen,
          status: data.status
        });
      }
    }
    
    res.json({ success: true, onlineDoctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update doctor bank details ──
export const updateBankDetails = async (req, res) => {
  try {
    const { accountHolderName, accountNumber, bankName, ifscCode, upiId } = req.body;
    const userId = req.user.id;
    const clinicId = req.user.clinicId;

    const user = await User.findOne({ _id: userId, clinicId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'doctor') {
      return res.status(403).json({ success: false, message: 'Only doctors can update bank details' });
    }

    user.bankDetails = {
      accountHolderName: accountHolderName || user.bankDetails?.accountHolderName,
      accountNumber: accountNumber || user.bankDetails?.accountNumber,
      bankName: bankName || user.bankDetails?.bankName,
      ifscCode: ifscCode || user.bankDetails?.ifscCode,
      upiId: upiId || user.bankDetails?.upiId,
      isVerified: false,
    };

    await user.save();

    res.json({
      success: true,
      message: 'Bank details updated successfully',
      bankDetails: user.bankDetails
    });
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};