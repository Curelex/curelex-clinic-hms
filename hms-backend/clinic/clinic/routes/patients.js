import express from 'express';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ── Helper: emit live queue update ────────────────────────────────────────────
async function broadcastQueueUpdate(io, clinicId, doctorId, date) {
  if (!io) return;
  try {
    const patients = await Patient.find({ clinicId, doctorId, date })
      .select('token name status')
      .sort({ token: 1 })
      .lean();

    const currentlyServing = patients.find((p) => p.status === 'called');
    const payload = {
      currentToken:   currentlyServing ? currentlyServing.token : null,
      currentPatient: currentlyServing ? currentlyServing.name  : null,
      waitingCount:   patients.filter((p) => p.status === 'waiting').length,
      doneCount:      patients.filter((p) => p.status === 'done').length,
      totalCount:     patients.length,
      patients:       patients.map((p) => ({ token: p.token, name: p.name, status: p.status })),
    };

    const room = `queue_${clinicId}_${doctorId}_${date}`;
    io.to(room).emit('queue_update', payload);
    
  } catch (err) {
    console.error('broadcastQueueUpdate error:', err.message);
  }
}

// ── GET /api/patients ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    // ✅ NEW: support receptionistId filter from admin dashboard
    const { date, doctorId, status, receptionistId } = req.query;

    const filter = { clinicId };
    if (date)           filter.date           = date;
    if (doctorId)       filter.doctorId       = doctorId;
    if (status)         filter.status         = status;
    // ✅ NEW: filter by receptionist
    if (receptionistId) filter.receptionistId = receptionistId;

    if (role === 'doctor') {
      filter.doctorId = req.user.id;
    } else if (!['admin', 'receptionist', 'pharmacist', 'owner', 'manager'].includes(role)) {
      return res.status(403).json({ message: 'Not allowed.' });
    }

    const patients = await Patient.find(filter)
      .select('-files.data')
      .sort({ token: 1 })
      .lean();

    const withCount = patients.map((p) => {
      const fileCount = (p.files || []).length;
      const { files, ...rest } = p;
      return { ...rest, fileCount };
    });

    res.json(withCount);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/patients/history/:phone ─────────────────────────────────────────
router.get('/history/:phone', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const visits = await Patient.find({ clinicId, phone })
      .sort({ date: -1, token: -1 })
      .lean();

    const visitsWithFiles = visits.map((v) => ({
      _id:              v._id,
      date:             v.date,
      time:             v.time,
      token:            v.token,
      symptoms:         v.symptoms,
      notes:            v.notes,
      doctorName:       v.doctorName,
      doctorId:         v.doctorId,
      receptionistName: v.receptionistName || '',   // ✅ NEW
      receptionistId:   v.receptionistId   || null, // ✅ NEW
      status:           v.status,
      files: (v.files || []).map((f) => ({
        _id:        f._id,
        filename:   f.filename,
        mimeType:   f.mimeType,
        size:       f.size,
        uploadedBy: f.uploadedBy,
        uploadedAt: f.uploadedAt,
      })),
    }));

    res.json({ success: true, visits: visitsWithFiles });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/patients/:id/files ───────────────────────────────────────────────
router.get('/:id/files', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const patient = await Patient.findOne({ _id: req.params.id, clinicId })
      .select('files._id files.filename files.mimeType files.size files.uploadedBy files.uploadedAt');

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient.files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/patients/:id/files/:fileId ──────────────────────────────────────
router.get('/:id/files/:fileId', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const file = patient.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found.' });

    res.set('Content-Type', file.mimeType);
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/patients/:id/files/:fileId ────────────────────────────────────
router.delete('/:id/files/:fileId', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist', 'doctor'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    patient.files.pull({ _id: req.params.fileId });
    await patient.save();

    res.json({ message: 'File deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/patients ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const {
      doctorId, doctorName,
      name, age, phone, whatsapp, gender, symptoms, notes,
      totalFee, paid, dues, paymentMethod,
      date, time,
    } = req.body;

    if (!doctorId || !name || !symptoms || !date || !time)
      return res.status(400).json({ message: 'Missing required fields.' });

    // Check doctor daily token limit
    const doctor = await User.findById(doctorId);
    if (doctor && doctor.dailyTokenLimit > 0) {
      const todayCount = await Patient.countDocuments({ clinicId, doctorId, date });
      if (todayCount >= doctor.dailyTokenLimit) {
        return res.status(400).json({
          message: `Token limit reached for Dr. ${doctorName}. Max ${doctor.dailyTokenLimit} patients per day.`,
        });
      }
    }

    // Next token number for this doctor today
    const lastPatient = await Patient.findOne({ clinicId, doctorId, date }).sort({ token: -1 });
    const token = lastPatient ? lastPatient.token + 1 : 1;

    // ✅ NEW: capture receptionist identity from the logged-in user
    // If role is 'receptionist', save their id and name
    // If role is 'admin', receptionistId stays null (admin registered directly)
    const receptionistId   = role === 'receptionist' ? (req.user.id  || null) : null;
    const receptionistName = role === 'receptionist' ? (req.user.name || '')  : '';

    const patient = await Patient.create({
      clinicId, doctorId, doctorName,
      token, name, age, phone, whatsapp, gender, symptoms, notes,
      totalFee, paid, dues, paymentMethod,
      date, time, status: 'waiting',
      // ✅ NEW
      receptionistId,
      receptionistName,
    });

    const io = req.app.get('io');
    await broadcastQueueUpdate(io, clinicId, doctorId, date);

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/patients/:id/status ───────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist', 'doctor'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const { status } = req.body;
    if (!['waiting', 'called', 'done'].includes(status))
      return res.status(400).json({ message: 'Invalid status.' });

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { status },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const io = req.app.get('io');
    await broadcastQueueUpdate(io, clinicId, patient.doctorId, patient.date);

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/patients/:id/followup ─────────────────────────────────────────
router.patch('/:id/followup', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { followUpDate, followUpNote } = req.body;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { followUpDate, followUpNote },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/patients/:id/payment ──────────────────────────────────────────
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { totalFee, paid, dues, paymentMethod } = req.body;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { totalFee, paid, dues, paymentMethod },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/patients/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const patient = await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const io = req.app.get('io');
    await broadcastQueueUpdate(io, clinicId, patient.doctorId, patient.date);

    res.json({ message: 'Patient deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;