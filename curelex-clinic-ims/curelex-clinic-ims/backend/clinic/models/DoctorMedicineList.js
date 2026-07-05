import mongoose from 'mongoose';

// ── Stores the doctor's personal medicine & test dictionaries ─────────────────
// One document per doctor. Lists grow as doctor adds new items.
const DoctorMedicineListSchema = new mongoose.Schema({
  doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  clinicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },

  // Unique medicine names this doctor has ever prescribed
  medicines: {
    type: [String],
    default: [],
  },

  // Unique test names this doctor has ever ordered
  tests: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

const DoctorMedicineList = mongoose.model('DoctorMedicineList', DoctorMedicineListSchema);
export default DoctorMedicineList;