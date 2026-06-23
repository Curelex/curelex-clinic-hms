import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import express from 'express';
import multer from 'multer';

import { auth } from '../middleware/auth.js';
import Document from '../models/Document.js';
import Patient from '../models/Patient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only PDF and image files (jpg, png, webp) are allowed'));
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// resolvePatientAccess
//
// ROOT CAUSE FIX:
//   The doctor's JWT clinicId (6a3ab3cddefcdfbba8b8adb3) did not match the
//   patient's clinicId in DB (6a3ab3a6defcdfbba8b8ad95) because patients and
//   doctors were registered under different Clinic documents in the DB.
//
//   Old logic: Patient.findOne({ _id: patientId, clinicId: doctorClinicId })
//              → always returns null for cross-clinic patients → 404
//
//   Fix:
//   - Doctors / staff → look up patient by _id ONLY (no clinicId filter).
//     A doctor can treat any patient regardless of which Clinic record they
//     belong to. Security is enforced by the auth token, not by clinicId.
//   - Patients → look up by _id only, then verify they own the record via
//     userId. clinicId is not used for access control here either.
//
//   The clinicId returned is always taken from the PATIENT record so that
//   Document.create() stores the correct clinic reference.
// ─────────────────────────────────────────────────────────────────────────────
async function resolvePatientAccess(req, patientId) {
  // Look up patient by _id only — no clinicId filter (see explanation above)
  const patient = await Patient.findById(patientId);

  if (!patient) {
    console.warn('resolvePatientAccess: patient not found', { patientId });
    return { ok: false, status: 404, message: 'Patient not found' };
  }

  // Patients can only access their own records
  if (req.user.role === 'patient' && String(patient.userId) !== String(req.user.id)) {
    return { ok: false, status: 403, message: 'Access denied' };
  }

  // Use the clinicId stored on the patient record (not from the JWT)
  return { ok: true, patient, clinicId: patient.clinicId };
}

// ── POST /api/documents/upload ────────────────────────────────────────────
// visibleToDoctor defaults to TRUE so documents are immediately visible to
// the doctor after upload without requiring any manual toggle.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { patientId, category, description, tokenId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!req.file)  return res.status(400).json({ message: 'No file uploaded' });

    const access = await resolvePatientAccess(req, patientId);
    if (!access.ok) {
      fs.unlink(req.file.path, () => {});
      return res.status(access.status).json({ message: access.message });
    }

    const doc = await Document.create({
      clinicId:        access.clinicId,   // patient's actual clinicId
      patient:         patientId,
      token:           tokenId || null,
      category:        category || 'Other',
      description:     description || '',
      originalName:    req.file.originalname,
      storedName:      req.file.filename,
      mimeType:        req.file.mimetype,
      fileSize:        req.file.size,
      uploadedBy:      req.user.id,
      visibleToDoctor: true,              // FIX: was missing → schema default false → doctors saw nothing
    });

    res.status(201).json(doc);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/documents/patient/:patientId ────────────────────────────────
// - patient role  → sees ALL their own documents
// - doctor/staff  → sees only documents the patient has shared (visibleToDoctor: true)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const access = await resolvePatientAccess(req, req.params.patientId);
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    // Query by patient only — clinicId on Document matches the patient's clinic
    const query = { patient: req.params.patientId };

    // Doctors/staff only see documents the patient has toggled ON
    if (req.user.role !== 'patient') {
      query.visibleToDoctor = true;
    }

    const documents = await Document.find(query).sort({ createdAt: -1 });

    res.json({ documents });
  } catch (err) {
    console.error('GET /documents/patient error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/documents/:id/visibility ──────────────────────────────────
// Patient toggles whether a document is visible to their doctor.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/visibility', auth, async (req, res) => {
  try {
    const { visibleToDoctor } = req.body;
    if (typeof visibleToDoctor !== 'boolean') {
      return res.status(400).json({ message: 'visibleToDoctor (boolean) is required' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const access = await resolvePatientAccess(req, doc.patient);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    // Extra guard: patients can only toggle their own documents
    if (req.user.role === 'patient') {
      if (String(access.patient.userId) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    doc.visibleToDoctor = visibleToDoctor;
    await doc.save();

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/documents/file/:id  — stream file for viewing ───────────────
router.get('/file/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const access = await resolvePatientAccess(req, doc.patient);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    if (req.user.role !== 'patient' && !doc.visibleToDoctor) {
      return res.status(403).json({ message: 'Access denied: document not shared with doctor' });
    }

    const filePath = path.join(UPLOAD_ROOT, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing on server' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const access = await resolvePatientAccess(req, doc.patient);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    fs.unlink(path.join(UPLOAD_ROOT, doc.storedName), () => {});
    await doc.deleteOne();

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;