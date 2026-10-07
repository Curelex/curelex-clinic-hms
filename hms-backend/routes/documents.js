import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';

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
// resolvePatientAccess — tenant-scoped patient lookup.
//   patient       → only their own record (userId match)
//   super_admin   → any patient
//   clinic staff  → only patients whose clinicIds contains the caller's clinicId
//   anyone else   → denied
// Out-of-scope patients return 404 so IDs cannot be probed across clinics.
// ─────────────────────────────────────────────────────────────────────────────
async function resolvePatientAccess(req, patientId) {
  if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
    return { ok: false, status: 404, message: 'Patient not found' };
  }

  const role = req.user.role;
  let patient = null;

  if (role === 'patient') {
    patient = await Patient.findOne({ _id: patientId, userId: req.user.id });
  } else if (role === 'super_admin') {
    patient = await Patient.findById(patientId);
  } else if (req.user.clinicId) {
    patient = await Patient.findOne({ _id: patientId, clinicIds: req.user.clinicId });
  } else {
    return { ok: false, status: 403, message: 'Access denied' };
  }

  if (!patient) {
    return { ok: false, status: 404, message: 'Patient not found' };
  }

  const clinicId = (patient.clinicIds && patient.clinicIds.length > 0)
    ? String(patient.clinicIds[0])
    : 'global';
  return { ok: true, patient, clinicId };
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
      clinicId:        access.clinicId || 'global', // guard: null-safe for patients with no clinic
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

    // Only the patient controls sharing
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Only the patient can change document sharing' });
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
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`);
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

    const canDelete =
      req.user.role === 'patient' ||
      req.user.role === 'admin' ||
      req.user.role === 'super_admin' ||
      String(doc.uploadedBy) === String(req.user.id);
    if (!canDelete) {
      return res.status(403).json({ message: 'You cannot delete this document' });
    }

    fs.unlink(path.join(UPLOAD_ROOT, doc.storedName), () => {});
    await doc.deleteOne();

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;