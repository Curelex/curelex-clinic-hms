// hms-backend/controllers/telemedicineController.js

import Telemedicine from '../models/Telemedicine.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

// ── Helper: Generate meeting link ──
function generateMeetingLink(meetingId) {
  return `https://meet.curelex.com/${meetingId}`;
}

function generateMeetingId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ── Patient requests telemedicine ──
export const requestTelemedicine = async (req, res) => {
  try {
    const { patientId, doctorId, symptoms, preferredTime, urgency } = req.body;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const patient = await Patient.findOne({ _id: patientId, clinicId });
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

    // Check if doctor is online
    const isDoctorOnline = global.doctorStatus?.get(doctorId)?.status === 'online';

    const telemedicine = await Telemedicine.create({
      patientId: patient._id,
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
    });

    // ── Create notification for doctor ──
    await Notification.create({
      userId: doctor._id,
      message: `🩺 New telemedicine request from ${patient.name}${urgency === 'urgent' ? ' (URGENT)' : urgency === 'emergency' ? ' 🚨 EMERGENCY' : ''}`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    // ── Socket.IO: Notify doctor in real-time ──
    const io = req.app.get('io');
    if (io) {
      // Send notification to doctor
      io.to(`doctor_${doctorId}`).emit('telemedicine:new-request', {
        requestId: telemedicine._id,
        patientId: patient._id,
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        symptoms: symptoms || '',
        urgency: urgency || 'normal',
        timestamp: new Date(),
        message: `📱 New telemedicine request from ${patient.name}`
      });

      // Also emit to all staff if emergency
      if (urgency === 'emergency') {
        io.emit('telemedicine:emergency-alert', {
          requestId: telemedicine._id,
          patientName: patient.name,
          doctorName: doctor.name,
          timestamp: new Date()
        });
      }
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

// ── Doctor approves request ──
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

    // Verify doctor owns this request
    if (String(telemedicine.doctorId) !== String(doctorId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.status !== 'requested') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    const meetingId = generateMeetingId();
    const meetingLink = generateMeetingLink(meetingId);

    telemedicine.status = 'approved';
    telemedicine.scheduledTime = scheduledTime || new Date(Date.now() + 30 * 60000);
    telemedicine.meetingId = meetingId;
    telemedicine.meetingLink = meetingLink;
    telemedicine.doctorNotes = doctorNotes || '';
    await telemedicine.save();

    // ── Notify patient ──
    await Notification.create({
      userId: telemedicine.patientId,
      message: `✅ Your telemedicine request has been approved by Dr. ${telemedicine.doctorName}`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    // ── Socket.IO: Notify patient ──
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'approved',
        scheduledTime: telemedicine.scheduledTime,
        meetingLink: telemedicine.meetingLink,
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: `✅ Your request has been approved by Dr. ${telemedicine.doctorName}`
      });
    }

    res.json({
      success: true,
      message: 'Telemedicine request approved',
      telemedicine,
    });
  } catch (error) {
    console.error('Approve telemedicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Doctor rejects request ──
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

    // ── Socket.IO: Notify patient ──
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:status-update', {
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

// ── Doctor starts meeting ──
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

    if (!['approved', 'scheduled', 'ready'].includes(telemedicine.status)) {
      return res.status(400).json({ success: false, message: 'Cannot start this meeting' });
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

    // ── Socket.IO: Notify patient ──
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:meeting-started', {
        requestId: telemedicine._id,
        meetingLink: telemedicine.meetingLink,
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: `🔴 Meeting started by Dr. ${telemedicine.doctorName}`
      });

      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:status-update', {
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

// ── Doctor ends meeting ──
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

    await Notification.create({
      userId: telemedicine.patientId,
      message: `✅ Meeting with Dr. ${telemedicine.doctorName} has ended. Duration: ${durationMinutes} minutes`,
      taskId: telemedicine._id,
      clinicId,
      read: false,
    });

    // ── Socket.IO: Notify patient ──
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:meeting-ended', {
        requestId: telemedicine._id,
        duration: durationMinutes,
        doctorId: telemedicine.doctorId,
        doctorName: telemedicine.doctorName,
        timestamp: new Date(),
        message: `✅ Meeting ended. Duration: ${durationMinutes} minutes`
      });

      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:status-update', {
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

// ── Patient cancels request ──
export const cancelTelemedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = req.user?.clinicId;
    const userId = req.user.id;

    const telemedicine = await Telemedicine.findOne({ _id: id, clinicId });
    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Allow patient or doctor to cancel
    if (String(telemedicine.patientId) !== String(userId) && 
        String(telemedicine.doctorId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!['requested', 'approved', 'scheduled'].includes(telemedicine.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this meeting' });
    }

    telemedicine.status = 'cancelled';
    await telemedicine.save();

    // ── Socket.IO: Notify both parties ──
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${telemedicine.patientId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'cancelled',
        timestamp: new Date(),
        message: '❌ Telemedicine session cancelled'
      });
      io.to(`doctor_${telemedicine.doctorId}`).emit('telemedicine:status-update', {
        requestId: telemedicine._id,
        status: 'cancelled',
        timestamp: new Date(),
        message: '❌ Telemedicine session cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Telemedicine cancelled',
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

// ── Get telemedicine stats ──
export const getTelemedicineStats = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId;

    const [total, requested, approved, ongoing, completed, cancelled, rejected] = await Promise.all([
      Telemedicine.countDocuments({ clinicId }),
      Telemedicine.countDocuments({ clinicId, status: 'requested' }),
      Telemedicine.countDocuments({ clinicId, status: 'approved' }),
      Telemedicine.countDocuments({ clinicId, status: 'ongoing' }),
      Telemedicine.countDocuments({ clinicId, status: 'completed' }),
      Telemedicine.countDocuments({ clinicId, status: 'cancelled' }),
      Telemedicine.countDocuments({ clinicId, status: 'rejected' }),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        requested,
        approved,
        ongoing,
        completed,
        cancelled,
        rejected,
      },
    });
  } catch (error) {
    console.error('Get telemedicine stats error:', error);
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