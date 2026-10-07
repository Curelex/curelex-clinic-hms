// hms-backend/scripts/backfillClinicCoords.js
// One-time script: geocode all existing clinics missing lat/long.
// Run with: node scripts/backfillClinicCoords.js
import 'dotenv/config';
import mongoose from 'mongoose';
import Clinic from '../models/Clinic.js';
import { geocodeAddress } from '../utils/geocode.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to DB');

  const clinics = await Clinic.find({
    $or: [{ latitude: null }, { latitude: { $exists: false } }],
    address: { $exists: true, $ne: '' },
  });

  console.log(`Found ${clinics.length} clinics missing coordinates`);

  let success = 0;
  let skipped = 0;

  for (const clinic of clinics) {
    const coords = await geocodeAddress({
      address: clinic.address,
      city: clinic.city,
      state: clinic.state,
      pincode: clinic.pincode,
    });

    if (coords) {
      clinic.latitude = coords.latitude;
      clinic.longitude = coords.longitude;
      await clinic.save();
      success++;
      console.log(`✅ ${clinic.name} -> ${coords.latitude}, ${coords.longitude}`);
    } else {
      skipped++;
      console.log(`⚠️  Skipped (geocode failed): ${clinic.name} — "${clinic.address}"`);
    }

    // Respect Nominatim's usage policy: max ~1 request/sec.
    await sleep(1100);
  }

  console.log(`\nDone. Success: ${success}, Skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Backfill script error:', err);
  process.exit(1);
});
