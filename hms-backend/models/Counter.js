// hms-backend/models/Counter.js
import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  // e.g. "patient_<clinicId>"
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

/**
 * Atomically increments and returns the next sequence number for `id`.
 * Uses findOneAndUpdate with $inc + upsert, which MongoDB executes as a
 * single atomic operation — so concurrent calls (e.g. two patients being
 * registered at the same instant) can never read the same "next" value.
 * Works correctly whether the counter document exists yet or not.
 */
CounterSchema.statics.getNextSequence = async function (id) {
  const counter = await this.findOneAndUpdate(
    { id },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

export default mongoose.model('Counter', CounterSchema);