import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/lab.js
import express from 'express';
import mongoose from 'mongoose';

import Lab from '../models/Lab.js';
import BillingRequest from '../models/BillingRequest.js';
import Patient from '../models/Patient.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

/**
 * Safely converts any clinicId value to a mongoose ObjectId or null.
 * Mirrors the helper in routes/patients.js so all clinic-scoped routers
 * behave identically instead of each inventing its own fallback.
 */
function toObjectId(id) {
  if (!id || id === 'default' || id === 'null' || id === 'undefined') return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return null;
}

/**
 * Resolves the effective clinicId for a request.
 * - Normal staff: always use their JWT clinicId.
 * - super_admin: JWT has no clinicId, so fall back in order:
 *     1. x-clinic-id request header
 *     2. req.body.clinicId
 *     3. req.query.clinicId
 * Returns null (not the string 'default') when nothing resolves — callers
 * decide whether that means "reject" or "search everywhere".
 */
function resolveClinicId(req) {
  if (req.user?.role === 'super_admin') {
    const id =
      req.headers['x-clinic-id'] ||
      req.body?.clinicId ||
      req.query?.clinicId ||
      null;
    return toObjectId(id);
  }
  return toObjectId(req.user?.clinicId);
}

// ── GET all lab tests — scoped to clinic ──────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected. Please select a clinic to view lab tests.' });
    }

    const { status, patient, page = 1, limit = 20 } = req.query;

    let query = { clinicId };
    if (status)  query.status  = status;
    if (patient) query.patient = patient;

    const total = await Lab.countDocuments(query);
    const labs  = await Lab.find(query)
      .populate('patient',   'name patientId')
      .populate('orderedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ labs, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single lab test — verify clinic ───────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected.' });
    }

    const lab = await Lab.findOne({ _id: req.params.id, clinicId })
      .populate('patient')
      .populate('orderedBy', 'name department');
    if (!lab) return res.status(404).json({ message: 'Lab test not found' });
    res.json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST create lab order — stamp with clinicId ───────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({
        message: 'No clinic selected. Please select a clinic before ordering a lab test.'
      });
    }

    const lab = await Lab.create({ ...req.body, clinicId, orderedBy: req.user.id });
    await lab.populate('patient', 'name patientId');
    res.status(201).json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT update lab order ──────────────────────────────────────────────────
// When status flips to 'Completed' a BillingRequest is auto-created (idempotent)
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    if (!clinicId) {
      return res.status(400).json({ message: 'No clinic selected.' });
    }

    const data = { ...req.body };
    delete data.clinicId; // clinicId is never changed via update
    if (req.body.status === 'Completed')        data.reportGeneratedAt = new Date();
    if (req.body.status === 'Sample Collected') data.sampleCollectedAt = new Date();

    const lab = await Lab.findOneAndUpdate(
      { _id: req.params.id, clinicId }, // ← scoped update
      data,
      { new: true }
    ).populate('patient', 'name patientId');

    if (!lab) return res.status(404).json({ message: 'Lab not found' });

    // ── Auto-create BillingRequest when lab is marked Completed ─────────
    if (req.body.status === 'Completed') {
      const alreadyExists = await BillingRequest.findOne({ lab: lab._id });

      if (!alreadyExists) {
        const testLines = (lab.tests || []).map(t => ({
          testName: t.testName,
          price:    t.price || 0,
        }));

        await BillingRequest.create({
          clinicId,                              // ← stamp clinic
          lab:             lab._id,
          labId:           lab.labId,
          patient:         lab.patient._id,
          patientId:       lab.patient.patientId,
          patientName:     lab.patient.name,
          tests:           testLines,
          totalAmount:     lab.totalAmount || 0,
          requestedBy:     req.user.id,
          requestedByName: req.user.name || '',
          status:          'Pending',
        });
      }
    }

    res.json(lab);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;