// hms-backend/routes/documents.js
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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only PDF and image files (jpg, png, webp) are allowed'));
    }
    cb(null, true);
  },
});

// Resolve whether the requester may act on the given patientId:
//  - patient role  -> must own that Patient record (Patient.userId === req.user.id)
//  - staff roles    -> any patient within the same clinic
async function resolvePatientAccess(req, patientId) {
  const clinicId = req.user.clinicId || 'default';
  const patient = await Patient.findOne({ _id: patientId, clinicId });
  if (!patient) return { ok: false, status: 404, message: 'Patient not found' };

  if (req.user.role === 'patient' && String(patient.userId) !== String(req.user.id)) {
    return { ok: false, status: 403, message: 'Access denied' };
  }
  return { ok: true, patient, clinicId };
}

// ── POST /api/documents/upload ─────────────────────────────────
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { patientId, category, description, tokenId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!req.file)  return res.status(400).json({ message: 'No file uploaded' });

    const access = await resolvePatientAccess(req, patientId);
    if (!access.ok) {
      fs.unlink(req.file.path, () => {}); // cleanup orphaned upload
      return res.status(access.status).json({ message: access.message });
    }

    const doc = await Document.create({
      clinicId:     access.clinicId,
      patient:      patientId,
      token:        tokenId || null,
      category:     category || 'Other',
      description:  description || '',
      originalName: req.file.originalname,
      storedName:   req.file.filename,
      mimeType:     req.file.mimetype,
      fileSize:     req.file.size,
      uploadedBy:   req.user.id,
    });

    res.status(201).json(doc);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/documents/patient/:patientId  — full history list ──
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const access = await resolvePatientAccess(req, req.params.patientId);
    if (!access.ok) {
      console.log('🔍 GET DOCUMENTS ACCESS FAILED:', access);
      return res.status(access.status).json({ message: access.message });
    }

    const query = { patient: req.params.patientId, clinicId: access.clinicId };
    if (req.user.role !== 'patient') {
      query.visibleToDoctor = true;
    }

    console.log('🔍 GET DOCUMENTS DEBUG:', {
      reqUser: { id: req.user.id, role: req.user.role, clinicId: req.user.clinicId },
      patientId: req.params.patientId,
      accessResult: { ok: access.ok, clinicId: access.clinicId },
      query,
    });

    const documents = await Document.find(query)
      .sort({ createdAt: -1 });

    console.log('🔍 FOUND DOCUMENTS:', documents);

    res.json({ documents });
  } catch (err) {
    console.error('🔍 GET DOCUMENTS ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/documents/:id/visibility ──
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

    const patient = await Patient.findById(doc.patient);
    if (req.user.role === 'patient' && String(patient.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    doc.visibleToDoctor = visibleToDoctor;
    await doc.save();

    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/documents/file/:id  — stream file for viewing ──────
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
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server' });

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/documents/:id ────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const access = await resolvePatientAccess(req, doc.patient);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    fs.unlink(path.join(UPLOAD_ROOT, doc.storedName), () => {}); // best-effort
    await doc.deleteOne();

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;