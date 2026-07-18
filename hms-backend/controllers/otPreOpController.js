import PreOpAssessment from '../models/ot/PreOpAssessment.js';
import ConsentForm from '../models/ot/ConsentForm.js';
import SafetyChecklist from '../models/ot/SafetyChecklist.js';
import OTBooking from '../models/ot/OTBooking.js';
import { logOTAction } from '../utils/otAuditLogger.js';

// ── Pre-Op Assessment ──
export const getPreOp = async (req, res) => {
  try {
    const { id } = req.params;
    let preop = await PreOpAssessment.findOne({ bookingId: id });
    if (!preop) {
      preop = await PreOpAssessment.create({ bookingId: id });
    }
    res.json(preop);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pre-op assessment' });
  }
};

export const updatePreOp = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    
    const preop = await PreOpAssessment.findOneAndUpdate(
      { bookingId: id },
      req.body,
      { new: true, upsert: true }
    );

    await logOTAction({
      entity: 'PreOpAssessment',
      entityId: preop._id,
      action: 'UPDATED',
      performedBy: userId,
      details: req.body
    });

    res.json(preop);
  } catch (err) {
    res.status(500).json({ message: 'Error updating pre-op assessment' });
  }
};

// ── Consent Forms ──
export const getConsents = async (req, res) => {
  try {
    const { id } = req.params;
    const consents = await ConsentForm.find({ bookingId: id });
    res.json(consents);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching consent forms' });
  }
};

export const uploadConsent = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    const { templateId, language } = req.body;
    
    // Multer places the files in req.files if we use .fields()
    let patientSignatureUrl = null;
    let relativeSignatureUrl = null;
    
    if (req.files) {
      if (req.files.patientSignature) {
        patientSignatureUrl = `/uploads/ot_consents/${req.files.patientSignature[0].filename}`;
      }
      if (req.files.relativeSignature) {
        relativeSignatureUrl = `/uploads/ot_consents/${req.files.relativeSignature[0].filename}`;
      }
    }

    const consent = await ConsentForm.create({
      bookingId: id,
      templateId,
      language,
      patientSignatureUrl,
      relativeSignatureUrl,
      signedAt: new Date()
    });

    await logOTAction({
      entity: 'ConsentForm',
      entityId: consent._id,
      action: 'UPLOADED',
      performedBy: userId,
      details: { templateId, language, patientSignatureUrl }
    });

    res.status(201).json(consent);
  } catch (err) {
    res.status(500).json({ message: 'Error uploading consent form' });
  }
};

// ── Safety Checklist ──
export const getSafetyChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const checklists = await SafetyChecklist.find({ bookingId: id });
    res.json(checklists);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching safety checklists' });
  }
};

export const updateSafetyChecklist = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { id, stage } = req.params; // stage: sign_in, time_out, sign_out
    const { items } = req.body;

    const checklist = await SafetyChecklist.findOneAndUpdate(
      { bookingId: id, stage },
      { items, completedBy: userId, completedAt: new Date() },
      { new: true, upsert: true }
    );

    await logOTAction({
      entity: 'SafetyChecklist',
      entityId: checklist._id,
      action: 'UPDATED',
      performedBy: userId,
      details: { stage, items }
    });

    res.json(checklist);
  } catch (err) {
    res.status(500).json({ message: 'Error updating safety checklist' });
  }
};
