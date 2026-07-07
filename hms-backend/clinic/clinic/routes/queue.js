import express from 'express';
import crypto from 'crypto';
import auth from '../middleware/auth.js';
import Patient from '../models/Patient.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';
import QueueSession from '../models/QueueSession.js';


const router = express.Router();

// ── Helper: generate secure random session token ──────────────────────────────
function generateSessionToken() {
  return crypto.randomBytes(10).toString('hex'); // 20-char hex string
}

// ── Helper: get today's queue snapshot for a doctor ──────────────────────────
async function getDoctorQueueSnapshot(clinicId, doctorId, date) {
  const patients = await Patient.find({
    clinicId,
    doctorId,
    date,
  })
    .select('token name status')
    .sort({ token: 1 })
    .lean();

  const currentlyServing = patients.find((p) => p.status === 'called');
  const waiting          = patients.filter((p) => p.status === 'waiting');
  const done             = patients.filter((p) => p.status === 'done');

  return {
    currentToken:   currentlyServing ? currentlyServing.token : null,
    currentPatient: currentlyServing ? currentlyServing.name  : null,
    waitingCount:   waiting.length,
    doneCount:      done.length,
    totalCount:     patients.length,
    patients:       patients.map((p) => ({ token: p.token, name: p.name, status: p.status })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/queue/track/:sessionToken   ← PUBLIC (no auth needed)
// Returns full queue snapshot + patient's own token info
// ─────────────────────────────────────────────────────────────────────────────
router.get('/track/:sessionToken', async (req, res) => {
  try {
    const session = await QueueSession.findOne({
      sessionToken: req.params.sessionToken,
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found or expired.' });
    }

    const snapshot = await getDoctorQueueSnapshot(
      session.clinicId,
      session.doctorId,
      session.date
    );

    const myToken     = session.tokenNumber;
    const nowServing  = snapshot.currentToken;

    // Tokens waiting ahead of patient
    const aheadCount = snapshot.patients.filter(
      (p) => p.status === 'waiting' && p.token < myToken
    ).length;

    // Estimated wait (avg 5 min per patient)
    const estWaitMins = aheadCount * 5;

    // Patient's own status
    const myRecord = snapshot.patients.find((p) => p.token === myToken);
    const myStatus = myRecord ? myRecord.status : 'waiting';

    return res.json({
      // Session info
      clinicName:   session.clinicName,
      doctorName:   session.doctorName,
      patientName:  session.patientName,
      date:         session.date,

      // My token
      myToken,
      myStatus,   // 'waiting' | 'called' | 'done'

      // Live queue
      currentToken:   nowServing,
      aheadCount,
      estWaitMins,
      totalPatients:  snapshot.totalCount,
      doneCount:      snapshot.doneCount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/queue/live/:clinicId/:doctorId/:date   ← INTERNAL (used by WebSocket)
// Returns live queue snapshot — called by socket server periodically
// ─────────────────────────────────────────────────────────────────────────────
router.get('/live/:clinicId/:doctorId/:date', auth, async (req, res) => {
  try {
    const { clinicId, doctorId, date } = req.params;
    const snapshot = await getDoctorQueueSnapshot(clinicId, doctorId, date);
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;