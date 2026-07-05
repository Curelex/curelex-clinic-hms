import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import Prescription from '../models/Prescription.js';
import DoctorMedicineList from '../models/DoctorMedicineList.js';
import Patient from '../models/Patient.js';
import Clinic from '../models/Clinic.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safely cast a string to ObjectId (returns null if invalid)
// ─────────────────────────────────────────────────────────────────────────────
function toObjectId(val) {
  try {
    return new mongoose.Types.ObjectId(String(val));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get today's date in IST as YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────
function getTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: update doctor's medicine/test dictionary
// ─────────────────────────────────────────────────────────────────────────────
async function updateDoctorDictionary(doctorId, clinicId, medicines = [], tests = []) {
  const medicineNames = medicines
    .map((m) => (m.name || '').trim())
    .filter(Boolean);
  const testNames = tests
    .map((t) => (t.name || '').trim())
    .filter(Boolean);

  if (medicineNames.length === 0 && testNames.length === 0) return;

  await DoctorMedicineList.findOneAndUpdate(
    { doctorId },
    {
      $set: { clinicId },
      $addToSet: {
        medicines: { $each: medicineNames },
        tests:     { $each: testNames },
      },
    },
    { upsert: true, new: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prescriptions
// Doctor creates a new prescription for a patient
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const doctorId = toObjectId(req.user.id);
    const clinicId = toObjectId(req.user.clinicId);

    if (!doctorId) {
      return res.status(400).json({ message: 'Invalid doctor session. Please log in again.' });
    }
    if (!clinicId) {
      return res.status(400).json({ message: 'Invalid clinic session. Please log in again.' });
    }

    const {
      patientId,
      diagnosis,
      medicines,
      tests,
      notes,
      followUpDate,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    const patientObjId = toObjectId(patientId);
    if (!patientObjId) {
      return res.status(400).json({ message: 'Invalid patientId' });
    }

    // Fetch patient + clinic for denormalized fields
    const [patient, clinic] = await Promise.all([
      Patient.findOne({ _id: patientObjId, clinicId }).lean(),
      Clinic.findById(clinicId).lean(),
    ]);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // ✅ FIX 1: doctorName fallback — never let it be empty string (schema required: true)
    const doctorName = (req.user.name || '').trim() || 'Doctor';

    // ✅ FIX 2: date fallback — patient.date may be undefined, causing required field 500
    const prescriptionDate = patient.date || getTodayIST();

    const prescription = await Prescription.create({
      clinicId,
      doctorId,
      patientId:        patientObjId,
      doctorName,                                          // ✅ FIXED
      doctorSpecialist: (req.user.specialist || '').trim(),
      patientName:      (patient.name   || '').trim() || 'Patient',
      patientAge:       patient.age      || '',
      patientGender:    patient.gender   || '',
      patientPhone:     patient.phone    || '',
      clinicName:       clinic?.name     || '',
      date:             prescriptionDate,                  // ✅ FIXED
      tokenNumber:      patient.token    || 0,
      diagnosis:        diagnosis        || '',
      medicines:        Array.isArray(medicines) ? medicines : [],
      tests:            Array.isArray(tests)     ? tests     : [],
      notes:            notes            || '',
      followUpDate:     followUpDate     || '',
    });

    // Auto-save medicine & test names to doctor's personal dictionary
    await updateDoctorDictionary(
      doctorId,
      clinicId,
      prescription.medicines,
      prescription.tests
    );

    return res.status(201).json({ success: true, prescription });
  } catch (err) {
    console.error('Create prescription error:', err);
    // ✅ FIX 3: return detailed validation errors so frontend shows real cause
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ message: `Validation failed: ${messages}` });
    }
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/patient/:patientId
// Get prescription(s) for a specific patient visit
// ─────────────────────────────────────────────────────────────────────────────
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const clinicId  = toObjectId(req.user.clinicId);
    const patientId = toObjectId(req.params.patientId);

    if (!patientId) return res.json({ success: true, prescriptions: [] });

    const prescriptions = await Prescription.find({ clinicId, patientId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/today
// Get ALL prescriptions for the clinic today
// ─────────────────────────────────────────────────────────────────────────────
router.get('/today', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);
    const today    = getTodayIST();

    const prescriptions = await Prescription.find({ clinicId, date: today })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/date/:date
// Get all prescriptions for a specific date (YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/date/:date', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);

    const prescriptions = await Prescription.find({
      clinicId,
      date: req.params.date,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/prescriptions/:id
// Doctor updates a prescription
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const doctorId = toObjectId(req.user.id);
    const clinicId = toObjectId(req.user.clinicId);
    const rxId     = toObjectId(req.params.id);

    if (!doctorId || !rxId) {
      return res.status(400).json({ message: 'Invalid IDs' });
    }

    const { diagnosis, medicines, tests, notes, followUpDate } = req.body;

    const prescription = await Prescription.findOneAndUpdate(
      { _id: rxId, clinicId, doctorId },
      {
        $set: {
          diagnosis:    diagnosis   || '',
          medicines:    Array.isArray(medicines) ? medicines : [],
          tests:        Array.isArray(tests)     ? tests     : [],
          notes:        notes        || '',
          followUpDate: followUpDate || '',
        },
      },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    await updateDoctorDictionary(
      doctorId,
      clinicId,
      prescription.medicines,
      prescription.tests
    );

    return res.json({ success: true, prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/prescriptions/:id/dispense
// Pharmacist marks prescription as dispensed
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/dispense', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);
    const rxId     = toObjectId(req.params.id);

    const prescription = await Prescription.findOneAndUpdate(
      { _id: rxId, clinicId },
      { $set: { isDispensed: true, isViewed: true, dispensedAt: new Date() } },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    return res.json({ success: true, prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/prescriptions/:id/viewed
// Pharmacist marks prescription as viewed
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/viewed', auth, async (req, res) => {
  try {
    const clinicId = toObjectId(req.user.clinicId);
    const rxId     = toObjectId(req.params.id);

    const prescription = await Prescription.findOneAndUpdate(
      { _id: rxId, clinicId },
      { $set: { isViewed: true } },
      { new: true }
    );

    if (!prescription) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true, prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/autocomplete
// Returns doctor's saved medicine & test names
// ─────────────────────────────────────────────────────────────────────────────
router.get('/autocomplete', auth, async (req, res) => {
  try {
    const doctorId = toObjectId(req.user.id);

    const list = await DoctorMedicineList.findOne({ doctorId }).lean();
    return res.json({
      success:   true,
      medicines: list?.medicines || [],
      tests:     list?.tests     || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;