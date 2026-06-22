import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import bcrypt from 'bcryptjs';

import { auth } from '../middleware/auth.js';
import Admission from '../models/Admission.js';
import Patient from '../models/Patient.js';
import ClinicRoomConfig from '../models/ClinicRoomConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────
function computeDays(admissionDate, dischargeDate) {
  const a    = new Date(admissionDate);
  const d    = dischargeDate ? new Date(dischargeDate) : new Date();
  const diff = Math.max(0, Math.round((d - a) / (1000 * 60 * 60 * 24)));
  return diff || 1;
}

// Default room config, shared by both seed-fallback paths below.
const ROOM_DEFAULTS = {
  'General Ward': { dailyRate: 800,  totalRooms: 5 },
  'Semi-Private': { dailyRate: 1500, totalRooms: 4 },
  'Private Room': { dailyRate: 2500, totalRooms: 3 },
  'ICU':          { dailyRate: 4000, totalRooms: 4 },
};

// ── GET /api/admissions  — list (with filters, clinic-scoped) ─────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { status, patient, page = 1, limit = 20 } = req.query;

    const query = { clinicId };
    if (status)  query.status  = status;
    if (patient) query.patient = patient;

    const total = await Admission.countDocuments(query);
    const admissions = await Admission.find(query)
      .populate('patient',    'name patientId phone age gender bloodGroup')
      .populate('doctor',     'name department')
      .populate('admittedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ admissions, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/active  — currently admitted patients ─────────────
router.get('/active', auth, async (req, res) => {
  try {
    const clinicId   = req.user.clinicId || 'default';
    const admissions = await Admission.find({ status: 'Admitted', clinicId })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .populate('doctor',  'name department')
      .sort({ admissionDate: -1 });
    res.json({ admissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/config/room-types  — dynamic room config ──────────
// FIX: previously this only used defaults when configs.length === 0. Once a
// single ClinicRoomConfig doc exists for the clinic (e.g. only "Semi-Private"
// after an admit), the other room types would silently disappear from the
// response. Now we merge: for each known room type, use the DB doc if it
// exists, otherwise fall back to that type's default — so all 4 types
// always appear, and any type that already has real DB data shows correctly.
router.get('/config/room-types', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const dbConfigs = await ClinicRoomConfig.find({ clinicId });

    const configs = Object.keys(ROOM_DEFAULTS).map(roomType => {
      const existing = dbConfigs.find(c => c.roomType === roomType);
      if (existing) return existing;
      const def = ROOM_DEFAULTS[roomType];
      return { roomType, dailyRate: def.dailyRate, totalRooms: def.totalRooms, availableRooms: def.totalRooms };
    });

    res.json(configs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/:id  — single admission ───────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId })
      .populate('patient',    'name patientId phone age gender bloodGroup allergies assignedDoctor')
      .populate('doctor',     'name department')
      .populate('admittedBy', 'name')
      .populate('bill');
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admissions  — admit a patient ───────────────────────────────
// FIX: roomConfig is now actually created in the DB (upsert) the first time
// a given roomType is used for a clinic, so the later $inc decrement has a
// real document to update. Previously, if no ClinicRoomConfig doc existed,
// the in-memory fallback object was used only for the availableRooms <= 0
// check, then `ClinicRoomConfig.updateOne(...)` (no upsert) matched ZERO
// documents and silently did nothing — so availableRooms in the DB never
// changed, and the room-types/room-settings endpoints kept returning the
// same untouched hardcoded defaults forever (100% free, regardless of
// admissions).
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { patientId, doctorId, roomType, roomNumber, notes } = req.body;

    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    // Verify the patient belongs to this clinic
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found in this clinic' });

    // Check if already admitted in this clinic
    const existing = await Admission.findOne({ patient: patientId, status: 'Admitted', clinicId });
    if (existing) return res.status(400).json({ message: 'Patient is already admitted' });

    const finalRoomType = roomType || 'General Ward';

    // Get (or create) room config for this clinic + roomType.
    // upsert ensures a real DB document exists from this point on, so the
    // later $inc decrement always has a document to apply to.
    let roomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: finalRoomType });
    if (!roomConfig) {
      const def = ROOM_DEFAULTS[finalRoomType] || { dailyRate: 800, totalRooms: 5 };
      roomConfig = await ClinicRoomConfig.create({
        clinicId,
        roomType:       finalRoomType,
        dailyRate:      def.dailyRate,
        totalRooms:     def.totalRooms,
        availableRooms: def.totalRooms, // starts full, about to be decremented below
      });
    }

    if (roomConfig.availableRooms <= 0) {
      return res.status(400).json({ message: `No ${finalRoomType} rooms available` });
    }

    const admission = await Admission.create({
      clinicId,
      patient:        patientId,
      doctor:         doctorId || undefined,
      admittedBy:     req.user.id,
      admittedByName: req.user.name,
      roomType:       finalRoomType,
      roomNumber:     roomNumber || '',
      roomRatePerDay: roomConfig.dailyRate,
      notes:          notes || '',
    });

    // Decrease available rooms (document is guaranteed to exist now)
    await ClinicRoomConfig.updateOne(
      { clinicId, roomType: finalRoomType },
      { $inc: { availableRooms: -1 } }
    );

    // Update patient status
    await Patient.findOneAndUpdate({ _id: patientId, clinicId }, { status: 'Active' });

    const populated = await Admission.findById(admission._id)
      .populate('patient', 'name patientId phone')
      .populate('doctor',  'name department');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Admission create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/admissions/:id/discharge ───────────────────────────────────
router.patch('/:id/discharge', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Not found' });

    const dischargeDate = new Date();
    const daysAdmitted  = computeDays(admission.admissionDate, dischargeDate);
    const roomRent      = daysAdmitted * admission.roomRatePerDay;

    admission.status        = 'Discharged';
    admission.dischargeDate = dischargeDate;
    admission.daysAdmitted  = daysAdmitted;
    admission.roomRent      = roomRent;
    await admission.save();

    await ClinicRoomConfig.updateOne(
      { clinicId, roomType: admission.roomType },
      { $inc: { availableRooms: +1 } }
    );

    await Patient.findOneAndUpdate(
      { _id: admission.patient, clinicId },
      { status: 'Discharged' }
    );

    res.json(admission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admissions/:id/medicines  — add medicine to log ────────────
router.post('/:id/medicines', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { medicineName, dosage, quantity, unitPrice, notes } = req.body;

    if (!medicineName) return res.status(400).json({ message: 'medicineName is required' });

    const qty   = Number(quantity)  || 1;
    const price = Number(unitPrice) || 0;

    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (admission.status !== 'Admitted') return res.status(400).json({ message: 'Patient not currently admitted' });

    admission.medicineLog.push({
      medicineName,
      dosage:      dosage || '',
      quantity:    qty,
      unitPrice:   price,
      total:       qty * price,
      givenBy:     req.user.id,
      givenByName: req.user.name,
      notes:       notes || '',
    });

    await admission.save();
    res.json(admission.medicineLog[admission.medicineLog.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/admissions/:id/medicines/:medId ───────────────────────────
router.delete('/:id/medicines/:medId', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Not found' });

    admission.medicineLog = admission.medicineLog.filter(
      m => String(m._id) !== req.params.medId
    );
    await admission.save();
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/admissions/:id/followup  — add follow-up note ──────────────
router.post('/:id/followup', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId || 'default';
    const { note, type, vitals } = req.body;

    if (!note) return res.status(400).json({ message: 'note is required' });

    const admission = await Admission.findOne({ _id: req.params.id, clinicId });
    if (!admission) return res.status(404).json({ message: 'Not found' });

    admission.followupLog.push({
      note,
      type:          type || 'General',
      writtenBy:     req.user.id,
      writtenByName: req.user.name,
      vitals:        vitals || {},
    });

    await admission.save();
    res.json(admission.followupLog[admission.followupLog.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admissions/:id/bill-summary ─────────────────────────────────
router.get('/:id/bill-summary', auth, async (req, res) => {
  try {
    const clinicId  = req.user.clinicId || 'default';
    const admission = await Admission.findOne({ _id: req.params.id, clinicId })
      .populate('patient', 'name patientId');
    if (!admission) return res.status(404).json({ message: 'Not found' });

    const daysAdmitted = admission.daysAdmitted ||
      computeDays(admission.admissionDate, admission.dischargeDate);
    const roomRent = daysAdmitted * admission.roomRatePerDay;

    const items = admission.medicineLog.map(m => ({
      description: `${m.medicineName}${m.dosage ? ' ' + m.dosage : ''}`,
      category:    'Medicine',
      addedByName: m.givenByName || 'Staff',
      quantity:    m.quantity,
      unitPrice:   m.unitPrice,
      total:       m.total,
      sourceRef:   String(m._id),
    }));

    res.json({
      admissionId:    admission.admissionId,
      patient:        admission.patient,
      items,
      admissionDate:  admission.admissionDate,
      dischargeDate:  admission.dischargeDate,
      daysAdmitted,
      roomType:       admission.roomType,
      roomRatePerDay: admission.roomRatePerDay,
      roomRent,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;