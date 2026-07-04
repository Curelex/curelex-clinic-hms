// ims-backend/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

// ── Staff / Admin Authentication ─────────────────────────────────────────
// Decodes JWT, enforces clinicId presence for all roles except super_admin.
export const protect = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    // super_admin has clinicId: null by design — let them through
    if (!decoded.clinicId && decoded.role !== 'super_admin') {
      return res.status(401).json({ message: 'Invalid token: missing clinicId' });
    }

    decoded._id  = decoded.id;        // Fix: controllers expect req.user._id
    req.user     = decoded;           // { id, _id, role, clinicId }
    req.userId   = decoded.id;
    req.clinicId = decoded.clinicId;  // null for super_admin
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// ── Clinic Middleware ─────────────────────────────────────────────────────
// Resolves clinicId from header → query → body → JWT (in that priority order).
// Use on routes where clinicId must be explicitly confirmed (e.g. super_admin
// acting on a specific clinic's data).
export const clinicMiddleware = (req, res, next) => {
  const clinicId =
    req.header('X-Clinic-Id') ||
    req.query.clinicId         ||
    req.body.clinicId          ||
    req.clinicId;

  if (!clinicId) {
    return res.status(400).json({
      success: false,
      message: 'Clinic ID is required',
    });
  }

  req.clinicId = clinicId;
  next();
};