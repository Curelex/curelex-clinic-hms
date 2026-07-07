import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import Patient from '../models/Patient.js';

// ── Multer configuration with memory storage ──────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG, GIF, WebP) and PDFs are allowed.'), false);
    }
  },
});

const router = express.Router();

// ── POST /api/clinic/patients/:patientId/files  — upload file ─────────────────
router.post('/:patientId/files', auth, upload.single('file'), async (req, res) => {
  try {
    const { clinicId, role, id: userId } = req.user;
    const { patientId } = req.params;

    // Validate input
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided.' });
    }

    // Validate patientId format
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID format.' });
    }

    // Get patient and verify clinic ownership
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Check authorization for doctors
    if (role === 'doctor' && String(patient.doctorId) !== String(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to upload files for this patient.' 
      });
    }

    // Prepare file data matching your schema
    const fileData = {
      _id: new mongoose.Types.ObjectId(), // Explicitly create ObjectId
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: role, // 'doctor' or 'receptionist' or 'admin'
      data: req.file.buffer,
      uploadedAt: new Date(),
    };

    // Add file to patient's files array
    patient.files.push(fileData);
    await patient.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      fileId: fileData._id,
      filename: fileData.filename,
      size: fileData.size,
      mimeType: fileData.mimeType,
    });
  } catch (err) {
    console.error('File upload error:', err);
    
    // Handle multer specific errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          success: false, 
          message: 'File too large. Maximum size is 5MB.' 
        });
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: err.message || 'Failed to upload file' 
    });
  }
});

// ── GET /api/clinic/patients/:patientId/files  — list all files ────────────────
router.get('/:patientId/files', auth, async (req, res) => {
  try {
    const { clinicId, role, id: userId } = req.user;
    const { patientId } = req.params;

    // Validate patientId format
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient ID format.' });
    }

    const patient = await Patient.findOne(
      { _id: patientId, clinicId },
      { files: 1, doctorId: 1 } // Only return files array and doctorId
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Check authorization for doctors
    if (role === 'doctor' && String(patient.doctorId) !== String(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view files for this patient.' 
      });
    }

    // Return file metadata without binary data
    const fileMetadata = patient.files.map((f) => ({
      _id: f._id,
      filename: f.filename,
      mimeType: f.mimeType,
      size: f.size,
      uploadedBy: f.uploadedBy,
      uploadedAt: f.uploadedAt,
    }));

    res.json({
      success: true,
      count: fileMetadata.length,
      files: fileMetadata,
    });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ── GET /api/clinic/patients/:patientId/files/:fileId  — download file ────────
router.get('/:patientId/files/:fileId', auth, async (req, res) => {
  try {
    const { clinicId, role, id: userId } = req.user;
    const { patientId, fileId } = req.params;

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(patientId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Check authorization for doctors
    if (role === 'doctor' && String(patient.doctorId) !== String(userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access files for this patient.' 
      });
    }

    // Find the file - convert both to string for comparison
    const file = patient.files.find((f) => String(f._id) === String(fileId));
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Set response headers for file download
    const disposition = req.query.download === 'false' ? 'inline' : 'attachment';
    
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.filename)}"`);
    res.setHeader('Content-Length', file.size);
    
    // Send the binary data
    res.send(file.data);
  } catch (err) {
    console.error('Download file error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ── DELETE /api/clinic/patients/:patientId/files/:fileId  — delete file ────────
router.delete('/:patientId/files/:fileId', auth, async (req, res) => {
  try {
    const { clinicId, role, id: userId } = req.user;
    const { patientId, fileId } = req.params;

    // Validate IDs format
    if (!mongoose.Types.ObjectId.isValid(patientId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format.' });
    }

    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const fileIndex = patient.files.findIndex((f) => String(f._id) === String(fileId));
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const fileToDelete = patient.files[fileIndex];
    
    // Authorization logic:
    // - Admin can delete any file
    // - Doctors can delete files for patients assigned to them
    // - Users can delete files they uploaded (based on uploadedBy and their role)
    let isAuthorized = false;
    
    if (role === 'admin') {
      isAuthorized = true;
    } else if (role === 'doctor' && String(patient.doctorId) === String(userId)) {
      isAuthorized = true;
    } else if (fileToDelete.uploadedBy === role && role !== 'doctor') {
      // Receptionists can delete files they uploaded
      isAuthorized = true;
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this file.' 
      });
    }

    // Remove file from array
    patient.files.splice(fileIndex, 1);
    await patient.save();

    res.json({ 
      success: true,
      message: 'File deleted successfully.' 
    });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

export default router;