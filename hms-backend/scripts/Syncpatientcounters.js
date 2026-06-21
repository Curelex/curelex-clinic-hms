// hms-backend/scripts/syncPatientCounters.js
//
// One-time fix-up script. Run this ONCE after deploying the new
// Counter-based patientId generation, to make sure each clinic's
// counter starts AHEAD of any patientId already in the database.
//
// Why this is needed: the new Counter collection starts every clinic
// at seq 0 the first time it's touched. If a clinic already has
// patients (e.g. "PAT00001" from earlier testing), the counter has no
// way of knowing that — so the very next registration tries to reuse
// "PAT00001" and hits the unique-index error.
//
// This script finds the highest existing patientId number per clinic
// and sets (or raises) the counter to match, so the next-generated ID
// always continues from there. Safe to re-run — it never lowers a
// counter, only raises it if needed ($max).
//
// Usage:
//   cd hms-backend
//   node scripts/syncPatientCounters.js
//
// Make sure your .env / MONGO_URI is set up the same way your server uses it.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from '../models/Patient.js';
import Counter from '../models/Counter.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ No MONGO_URI / MONGODB_URI found in environment. Check your .env file.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const clinicIds = await Patient.distinct('clinicId');
  console.log(`Found ${clinicIds.length} clinic(s) with patients.\n`);

  for (const clinicId of clinicIds) {
    const patients = await Patient.find({
      clinicId,
      patientId: { $regex: /^PAT\d+$/ },
    })
      .select('patientId')
      .lean();

    let maxSeq = 0;
    for (const p of patients) {
      const match = p.patientId.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }

    const counterId = `patient_${clinicId}`;

    if (maxSeq === 0) {
      console.log(`Clinic ${clinicId}: no existing PAT### patients found, leaving counter as-is.`);
      continue;
    }

    // $max only raises the stored seq if maxSeq is bigger than what's
    // already there — safe to re-run, never moves the counter backwards.
    const result = await Counter.findOneAndUpdate(
      { id: counterId },
      { $max: { seq: maxSeq } },
      { upsert: true, new: true }
    );

    console.log(
      `Clinic ${clinicId}: highest existing patientId = PAT${String(maxSeq).padStart(5, '0')} → counter now at seq ${result.seq}`
    );
  }

  console.log('\n✅ Done. New patients will now be generated starting after the highest existing ID per clinic.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});