import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/roomSettings.js

import express from 'express';

import { auth } from '../middleware/auth.js';
import ClinicRoomConfig from '../models/ClinicRoomConfig.js';

const router = express.Router();
/**
 * Resolves clinicId from (in priority order):
 *  1. req.body.clinicId   — POST/PUT requests pass it in the body
 *  2. req.query.clinicId  — GET requests pass it as a query param
 *  3. req.user.clinicId   — set by the auth middleware from the JWT
 *  4. 'default'           — safe fallback
 */
function resolveClinicId(req) {
  return (
    req.body?.clinicId  ||
    req.query?.clinicId ||
    req.user?.clinicId  ||
    'default'
  );
}

const hasPerm = (user, permKey) =>
  Array.isArray(user.permissions) && user.permissions.includes(permKey);

// Default room config, shared by both seed-fallback paths below. Keep this
// in sync with routes/admissions.js ROOM_DEFAULTS.
const ROOM_DEFAULTS = {
  'General Ward': { dailyRate: 800,  totalRooms: 5 },
  'Semi-Private': { dailyRate: 1500, totalRooms: 4 },
  'Private Room': { dailyRate: 2500, totalRooms: 3 },
  'ICU':          { dailyRate: 4000, totalRooms: 4 },
};

// ── GET room config (any authenticated user) ──
// FIX: previously this only fell back to hardcoded defaults when configs
// had ZERO docs at all. Once a single ClinicRoomConfig doc existed for the
// clinic (e.g. only "Semi-Private", created after an admit), the response
// would contain ONLY that one room type — the Dashboard's Hospital Room
// Summary table would silently drop General Ward / Private Room / ICU.
// Now we merge per-type: each known room type uses its real DB doc if one
// exists, otherwise its default — so all room types always show up, and
// any type with live data (e.g. decremented availableRooms after an admit)
// reflects correctly.
router.get('/', auth, async (req, res) => {
  try {
    const clinicId  = resolveClinicId(req);
    const dbConfigs = await ClinicRoomConfig.find({ clinicId });

    const configs = Object.keys(ROOM_DEFAULTS).map(roomType => {
      const existing = dbConfigs.find(c => c.roomType === roomType);
      if (existing) return existing;
      const def = ROOM_DEFAULTS[roomType];
      return { roomType, dailyRate: def.dailyRate, totalRooms: def.totalRooms, availableRooms: def.totalRooms };
    });

    res.json(configs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── BULK UPDATE room config (requires 'room-settings' permission) ──
router.post('/bulk', auth, async (req, res) => {

  try {
    console.log("BODY:", req.body);

    // if (!hasPerm(req.user, 'room-settings')) {
    //   return res.status(403).json({
    //     message: 'Access denied. You need room-settings permission.'
    //   });
    // }

    const clinicId = resolveClinicId(req);
    const { configs } = req.body;

    console.log("CLINIC ID:", clinicId);
    console.log("CONFIGS:", configs);

    const operations = configs.map(config => ({
      updateOne: {
        filter: { clinicId, roomType: config.roomType },
        update: {
          $set: {
            dailyRate: config.dailyRate,
            totalRooms: config.totalRooms,
            availableRooms: config.availableRooms,
          },
        },
        upsert: true,
      },
    }));

    console.log("OPERATIONS:", operations);

    await ClinicRoomConfig.bulkWrite(operations);

    console.log("✅ BULK WRITE SUCCESS");

    res.json({ message: 'Room settings updated successfully' });

  } catch (err) {
    console.error("❌ ROOM SAVE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── SINGLE UPDATE (requires 'room-settings' permission) ──
router.put('/:roomType', auth, async (req, res) => {
  try {
    if (!hasPerm(req.user, 'room-settings')) {
      return res.status(403).json({ message: 'Access denied. You need room-settings permission.' });
    }

    const clinicId  = resolveClinicId(req);
    const { roomType }                         = req.params;
    const { dailyRate, totalRooms, availableRooms } = req.body;

    const config = await ClinicRoomConfig.findOneAndUpdate(
      { clinicId, roomType },
      { dailyRate, totalRooms, availableRooms },
      { upsert: true, new: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


export default router;