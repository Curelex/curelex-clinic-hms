// hms-backend/models/EmergencyEncounter.js
import mongoose from 'mongoose';

const emergencyEncounterSchema = new mongoose.Schema({
    clinicId: {
        type: String,
        required: true,
        index: true,
        default: 'default'
    },
    patientName: { type: String, required: true },
    age: { type: Number, required: true },
    chiefComplaint: { type: String, required: true },
    vitals: {
        bloodPressure: String,
        heartRate: String,
        temperature: String,
        spO2: String
    },
    triageLevel: {
        type: String,
        enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
        required: true
    },
    status: {
        type: String,
        enum: ['Waiting', 'In Treatment', 'Admitted', 'Discharged'],
        default: 'Waiting'
    },
    allocatedBed: { type: String, default: null },
    encounterType: { type: String, default: 'EMERGENCY' },
    encounter_type: { type: String, default: 'EMERGENCY' },
    assignedDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    doctorName: { type: String, required: true },
    doctorNotified: { type: Boolean, default: false },
    notifiedAt: { type: Date },
}, { timestamps: true });

// Add compound index for clinic + status queries
emergencyEncounterSchema.index({ clinicId: 1, status: 1 });
emergencyEncounterSchema.index({ clinicId: 1, triageLevel: 1 });
emergencyEncounterSchema.index({ clinicId: 1, assignedDoctor: 1 });

export default mongoose.model('EmergencyEncounter', emergencyEncounterSchema);