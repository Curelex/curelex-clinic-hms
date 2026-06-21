// hms-backend/models/Counter.js
import mongoose from 'mongoose';

// Generic atomic counter collection.
// _id is a namespaced key, e.g. `patient_<clinicId>`, so each clinic
// (and each entity type, if you reuse this for invoices/tokens/etc.)
// gets its own independent, gapless-under-concurrency sequence.
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', CounterSchema);