import express from 'express';

import { patientAuth } from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import Token from '../models/Token.js';
import User from '../models/User.js';
import VitalLog from '../models/VitalLog.js';
import Billing from '../models/Billing.js';
import VentilatorLog from '../models/VentilatorLog.js';
import Admission from '../models/Admission.js';
import otBillingService from '../services/otBillingService.js';

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────
function todayStr() {
  const d   = new Date();
  const yr  = d.getFullYear();
  const mo  = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
}

function genTransactionId() {
  return 'MOCKTXN-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
}

function computeDays(admissionDate, dischargeDate) {
  const a = new Date(admissionDate);
  const d = dischargeDate ? new Date(dischargeDate) : new Date();
  const diff = Math.max(0, Math.round((d - a) / (1000 * 60 * 60 * 24)));
  return diff || 1;
}

/**
 * A patient gets a SEPARATE Patient document per clinic (clinics are
 * tenant-scoped). When the same person books at a new clinic — e.g. via
 * the unified doctor/clinic search — a brand-new Patient _id is created
 * for them at that clinic, even though it's the same real person.
 *
 * This helper finds every Patient document that represents the same
 * person as `patient` (matched by email, falling back to phone) so that
 * appointment/stat queries can include tokens from ALL their clinics,
 * not just the one tied to the originally logged-in Patient _id.
 */
async function getLinkedPatientIds(patient) {
  const orConditions = [];
  if (patient.email) orConditions.push({ email: patient.email });
  if (patient.phone) orConditions.push({ phone: patient.phone });

  if (orConditions.length === 0) {
    return [patient._id];
  }

  const linked = await Patient.find({ $or: orConditions }).select('_id');
  return linked.map((p) => p._id);
}

async function hasActiveToken(clinicId, patientId) {
  const activeStatuses = ['Waiting', 'Called', 'Pending', 'Active'];
  
  const activeToken = await Token.findOne({
    clinicId,
    patient: patientId,
    status: { $in: activeStatuses },
  }).populate('doctor', 'name');
  
  return activeToken;
}

router.get('/:id/dashboard', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientIds = await getLinkedPatientIds(patient);

    const totalAppointments = await Token.countDocuments({ patient: { $in: patientIds } });
    const upcomingAppointments = await Token.countDocuments({
      patient: { $in: patientIds },
      status: { $in: ['Waiting', 'Pending', 'Called'] },
    });

    const activeAdmission = await Admission.findOne({ 
      patient: patient._id, 
      status: 'Admitted' 
    });

    // ── NEW: Get pending bills ──
    const pendingBills = await Billing.find({ 
      patient: patient._id, 
      paymentStatus: { $in: ['Pending', 'Partial'] } 
    });

    const totalPendingAmount = pendingBills.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0);

    res.json({
      success: true,
      data: {
        totalAppointments,
        upcomingAppointments,
        prescriptionsCount: 0,
        doctorsConsulted: 0,
        patientName: patient.name,
        patientEmail: patient.email,
        patientMobile: patient.mobile || patient.phone,
        isAdmitted: !!activeAdmission,
        // "Currently in ICU" requires the ICU flag AND that the ICU portion
        // of the stay hasn't already ended — isICU stays true as a historical
        // marker even after a patient is discharged from ICU back to a
        // general ward, so icuDischargeDate is what tells us it's over.
        hasICUAdmission: !!(activeAdmission?.isICU && !activeAdmission?.icuDischargeDate),
        pendingBills: pendingBills.length,          // ← NEW
        totalPendingAmount,                          // ← NEW
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/profile ─────────────────────────────────────────────────────
router.get('/:id/profile', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/appointments ────────────────────────────────────────────────
router.get('/:id/appointments', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Include tokens booked under any of this person's clinic-scoped
    // Patient records (see getLinkedPatientIds) so appointments created
    // at a NEW clinic — e.g. via the unified doctor/clinic search — show
    // up here too, not just the ones tied to the original Patient _id.
    const patientIds = await getLinkedPatientIds(patient);

    const tokens = await Token.find({ patient: { $in: patientIds } })
      .populate('doctor', 'name department consultationFee telemedicineFee')
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, appointments: tokens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /doctors/:clinicId ───────────────────────────────────────────────
router.get('/doctors/:clinicId', patientAuth, async (req, res) => {
  try {
    const { clinicId } = req.params;

    let query;
    if (clinicId === 'independent') {
      query = { role: 'separate_doctor', isActive: true };
    } else {
      query = { clinicId, role: 'doctor', isActive: true };
    }

    const doctors = await User.find(
      query,
      'name department consultationFee telemedicineFee'
    ).sort({ name: 1 });

    res.json({ success: true, doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /payments/mock ──────────────────────────────────────────────────
router.post('/payments/mock', patientAuth, async (req, res) => {
  try {
    const { doctorId, amount, method } = req.body;

    if (!doctorId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'doctorId and amount are required' });
    }

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const transactionId = genTransactionId();
    const paidAt = new Date();

    res.json({
      success: true,
      payment: {
        paymentStatus: 'paid',
        transactionId,
        paidAt,
        amount: Number(amount),
        method: method || 'card',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /:id/appointments ───────────────────────────────────────────────
router.post('/:id/appointments', patientAuth, async (req, res) => {
  try {
    const {
      name, age, gender, symptoms,
      clinicId,
      doctorId, consultationType,
      paymentStatus, transactionId, paidAt, method,
    } = req.body;

    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (!name || !age || !gender || !symptoms || !doctorId || !consultationType || !clinicId) {
      return res.status(400).json({
        success: false,
        message: 'Name, age, gender, symptoms, clinic, doctor and consultation type are required',
      });
    }

    if (!['online', 'in-person'].includes(consultationType)) {
      return res.status(400).json({ success: false, message: 'Invalid consultation type' });
    }

    if (paymentStatus !== 'paid' || !transactionId) {
      return res.status(402).json({
        success: false,
        message: 'Payment is required before a token can be created',
      });
    }

    const doctor = await User.findOne({ _id: doctorId, clinicId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found for this clinic' });
    }

    // ── CHECK FOR ACTIVE TOKEN ──
    // A patient can only have one active token at a time
    // Active statuses: 'Waiting', 'Called', 'Pending', 'Active'
    // Also check for any token from today that's not completed
    const date = todayStr();
    
    // Check for active token
    const activeToken = await hasActiveToken(clinicId, patient._id);
    
    if (activeToken) {
      return res.status(400).json({
        success: false,
        message: `You already have an active token (#${activeToken.tokenNumber}) with Dr. ${activeToken.doctor?.name || 'Unknown'}. Please complete your current consultation before booking another appointment.`,
        activeToken: {
          tokenNumber: activeToken.tokenNumber,
          doctorName: activeToken.doctor?.name || 'Unknown',
          status: activeToken.status,
          tokenId: activeToken._id,
        }
      });
    }

    // Additional safety check: any token from today that's not completed
    const todayToken = await Token.findOne({
      clinicId,
      patient: patient._id,
      date: date,
      status: { $nin: ['Done', 'Skipped', 'Cancelled'] },
    }).populate('doctor', 'name');

    if (todayToken) {
      return res.status(400).json({
        success: false,
        message: `You have an appointment (#${todayToken.tokenNumber}) from today with Dr. ${todayToken.doctor?.name || 'Unknown'}. Please complete this appointment first.`,
        activeToken: {
          tokenNumber: todayToken.tokenNumber,
          doctorName: todayToken.doctor?.name || 'Unknown',
          status: todayToken.status,
          tokenId: todayToken._id,
        }
      });
    }

    // ✅ FIX: scope tokenNumber per clinic + doctor + date
    // This matches the unique index: { clinicId, doctor, date, tokenNumber }
    const last = await Token.findOne({ clinicId, doctor: doctorId, date })
      .sort({ tokenNumber: -1 })
      .select('tokenNumber');
    const tokenNumber = last ? last.tokenNumber + 1 : 1;

    const token = await Token.create({
      clinicId,
      tokenNumber,
      date,
      patient: patient._id,
      patientName: name,
      generatedBy: patient.userId,
      age: Number(age),
      gender,
      symptoms,
      source: 'patient',
      status: 'Pending',
      doctor: doctor._id,
      consultationType,
      consultationFee: doctor.consultationFee || 0,
      paymentStatus: 'paid',
      paymentMethod: method || 'card',
      transactionId,
      paidAt: paidAt || new Date(),
    });

    await Patient.findByIdAndUpdate(patient._id, { $addToSet: { clinicIds: clinicId } });

    await token.populate('doctor', 'name department consultationFee');

    res.status(201).json({ success: true, appointment: token });
  } catch (error) {
    // Handle race-condition duplicate key gracefully
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Token number conflict — please try again.',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/appointments/:tokenId/cancel', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Same reasoning as getLinkedPatientIds elsewhere in this file: a token
    // may be booked under a different clinic-scoped Patient _id for the
    // same person, so don't scope strictly to req.params.id.
    const patientIds = await getLinkedPatientIds(patient);

    const token = await Token.findOne({ _id: req.params.tokenId, patient: { $in: patientIds } });
    if (!token) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (!['Pending', 'Waiting'].includes(token.status)) {
      return res.status(400).json({
        success: false,
        message: `This appointment is already ${token.status.toLowerCase()} and can no longer be cancelled here. Please contact the clinic.`,
      });
    }

    token.status = 'Skipped';
    await token.save();
    await token.populate('doctor', 'name department consultationFee');

    res.json({ success: true, message: 'Appointment cancelled', appointment: token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /:id/prescriptions ───────────────────────────────────────────────
router.get('/:id/prescriptions', patientAuth, async (req, res) => {
  try {
    let patient = await Patient.findById(req.params.id);
    if (!patient) patient = await Patient.findOne({ userId: req.params.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, prescriptions: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


router.get('/:id/admission', patientAuth, async (req, res) => {
  try {
    const patientId = req.params.id;
    
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await Patient.findOne({ userId: patientId });
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // ── Find the patient's CURRENT hospital admission ──
    const admission = await Admission.findOne({ 
      patient: patient._id,
      status: 'Admitted'
    })
      .populate('doctor', 'name department')
      .populate('admittedBy', 'name')
      .populate('icuAssignedReceptionist', 'name')
      .sort({ createdAt: -1 });

    if (!admission) {
      return res.json({ 
        success: true, 
        admitted: false, 
        admission: null,
        message: 'No active admission found'
      });
    }

    const isCurrentlyAdmitted = admission.status === 'Admitted';

    // ── Is the patient CURRENTLY in the ICU? ──
    const isCurrentlyInICU = !!admission.isICU && !admission.icuDischargeDate;

    // ── Get vitals (only while genuinely in the ICU) ──
    let latestVitals = null;
    let vitalsHistory = [];
    let ventilatorLogs = [];
    
    if (isCurrentlyInICU) {
      vitalsHistory = await VitalLog.find({ 
        patientId: patient._id,
        admissionId: admission._id
      }).sort({ createdAt: -1 }).limit(50);
      
      latestVitals = vitalsHistory[0] || null;
      
      ventilatorLogs = await VentilatorLog.find({
        patientId: patient._id,
        admissionId: admission._id
      }).sort({ createdAt: -1 });
    }

    const days = admission.daysAdmitted || computeDays(admission.admissionDate, admission.dischargeDate);
    const roomRent = days * admission.roomRatePerDay;
    const medicinesTotal = admission.medicineLog.reduce((sum, m) => sum + (m.total || 0), 0);
    const grandTotal = roomRent + medicinesTotal + (admission.icuTotalCharges || 0);

    res.json({
      success: true,
      admitted: isCurrentlyAdmitted,
      admission: {
        ...admission.toObject(),
        days,
        roomRent,
        medicinesTotal,
        grandTotal,
        latestVitals,
        vitalsHistory,
        ventilatorLogs,
        isICU: isCurrentlyInICU,
        isDischarged: admission.status === 'Discharged',
      },
    });
  } catch (err) {
    console.error('Get admission error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.get('/:id/admissions/history', patientAuth, async (req, res) => {
  try {
    const patientId = req.params.id;
    
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await Patient.findOne({ userId: patientId });
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // ── FIX: Get ALL admissions (including discharged) ──
    const admissions = await Admission.find({ patient: patient._id })
      .populate('doctor', 'name department')
      .sort({ createdAt: -1 }); // Most recent first

    // ── Format each admission ──
    const history = admissions.map((adm) => {
      const days = adm.daysAdmitted || computeDays(adm.admissionDate, adm.dischargeDate);
      const roomRent = adm.roomRent || days * adm.roomRatePerDay;
      const medicinesTotal = adm.medicineLog.reduce((sum, m) => sum + (m.total || 0), 0);
      
      return {
        _id: adm._id,
        admissionId: adm.admissionId,
        roomType: adm.roomType,
        roomNumber: adm.roomNumber,
        roomRatePerDay: adm.roomRatePerDay,
        admissionDate: adm.admissionDate,
        dischargeDate: adm.dischargeDate,
        days,
        roomRent,
        medicinesTotal,
        grandTotal: roomRent + medicinesTotal,
        doctor: adm.doctor,
        status: adm.status,
        isICU: adm.isICU || false,
        notes: adm.notes,
        createdAt: adm.createdAt,
      };
    });

    // ── Separate current admission (if any) ──
    const currentAdmission = admissions.find(a => a.status === 'Admitted');
    const pastAdmissions = admissions.filter(a => a.status === 'Discharged' || a.status === 'Transferred');

    res.json({
      success: true,
      currentAdmission: currentAdmission || null,
      pastAdmissions: pastAdmissions,
      history: history,
      total: admissions.length,
    });
  } catch (err) {
    console.error('Get admission history error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── NEW: GET /:id/bills ──
router.get('/:id/bills', patientAuth, async (req, res) => {
  try {
    const patientId = req.params.id;
    
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await Patient.findOne({ userId: patientId });
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const bills = await Billing.find({ patient: patient._id })
      .populate('generatedBy', 'name')
      .sort({ createdAt: -1 });

    const pendingBills = bills.filter(b => b.paymentStatus === 'Pending' || b.paymentStatus === 'Partial');
    const paidBills = bills.filter(b => b.paymentStatus === 'Paid');

    res.json({
      success: true,
      bills,
      pendingBills,
      paidBills,
      totalPending: pendingBills.reduce((sum, b) => sum + (b.totalAmount - b.paidAmount), 0),
      totalPaid: paidBills.reduce((sum, b) => sum + b.paidAmount, 0),
    });
  } catch (err) {
    console.error('Get bills error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── NEW: POST /:id/bills/:billId/pay ──
router.post('/:id/bills/:billId/pay', patientAuth, async (req, res) => {
  try {
    const { id, billId } = req.params;
    const { amount, paymentMethod } = req.body;
    
    let patient = await Patient.findById(id);
    if (!patient) {
      patient = await Patient.findOne({ userId: id });
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // ── CHECK FOR ACTIVE TOKEN ──
    // Block payment if patient has active token
    const activeToken = await hasActiveToken(patient.clinicIds?.[0] || req.body.clinicId, patient._id);
    
    if (activeToken) {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment: You have an active token (#${activeToken.tokenNumber}) with Dr. ${activeToken.doctor?.name || 'Unknown'}. Please complete your consultation first.`,
        activeToken: {
          tokenNumber: activeToken.tokenNumber,
          doctorName: activeToken.doctor?.name || 'Unknown',
          status: activeToken.status,
          tokenId: activeToken._id,
        }
      });
    }

    const bill = await Billing.findOne({ _id: billId, patient: patient._id });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const payAmount = Number(amount) || bill.totalAmount - bill.paidAmount;
    
    if (payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    if (payAmount > (bill.totalAmount - bill.paidAmount)) {
      return res.status(400).json({ 
        success: false, 
        message: `Amount exceeds remaining balance. Remaining: ₹${(bill.totalAmount - bill.paidAmount).toLocaleString()}` 
      });
    }

    bill.paidAmount += payAmount;
    bill.paymentMethod = paymentMethod || bill.paymentMethod || 'UPI';
    
    if (bill.paidAmount >= bill.totalAmount) {
      bill.paymentStatus = 'Paid';
    } else {
      bill.paymentStatus = 'Partial';
    }
    
    await bill.save();

    const transactionId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    res.json({
      success: true,
      message: 'Payment processed successfully',
      bill,
      transactionId,
      paidAmount: payAmount,
      remainingAmount: bill.totalAmount - bill.paidAmount,
      paymentStatus: bill.paymentStatus,
    });
  } catch (err) {
    console.error('Pay bill error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/ot-charges', patientAuth, async (req, res) => {
  try {
    const patientId = req.params.id;
    
    let patient = await Patient.findById(patientId);
    if (!patient) {
      patient = await Patient.findOne({ userId: patientId });
    }
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const result = await otBillingService.getPatientOTCharges(patientId);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('Get OT charges error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;