// hms-backend/routes/emergency.js
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
import express from 'express';
const router = express.Router();
import EmergencyEncounter from '../models/EmergencyEncounter.js';
import Bed from '../models/Bed.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

/**
 * Resolves clinicId from (in priority order):
 *  1. req.query.clinicId  — GET requests pass it as a query param
 *  2. req.body.clinicId   — POST requests pass it in the body
 *  3. req.user.clinicId   — set by the auth middleware from the JWT
 *  4. 'default'           — safe fallback
 */
function resolveClinicId(req) {
    return (
        req.body?.clinicId ||
        req.query?.clinicId ||
        req.user?.clinicId ||
        'default'
    );
}

// We wrap the router in a function so we can pass the Socket.IO instance into it
export default (io) => {

    // 1. Emergency Patient Intake (Fast Registration)
    router.post('/intake', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            const { assignedDoctor, doctorName, ...rest } = req.body;

            // Validate doctor exists in this clinic
            const doctor = await User.findOne({ _id: assignedDoctor, clinicId, role: 'doctor' });
            if (!doctor || doctor.role !== 'doctor') {
                return res.status(400).json({ message: 'Invalid doctor selected for this clinic' });
            }

            const newEncounter = new EmergencyEncounter({
                ...rest,
                clinicId,
                assignedDoctor,
                doctorName,
            });

            const savedEncounter = await newEncounter.save();

            // ─── NOTIFICATIONS ─────────────────────────────────────
            // 1. Public queue update (for reception/nurses)
            if (io) io.to(`clinic_${clinicId}_emergency`).emit('emergencyQueueUpdated');

            // 2. Private notification to assigned doctor
            const notificationData = {
                type: 'EMERGENCY_PATIENT',
                encounterId: savedEncounter._id,
                patientName: savedEncounter.patientName,
                triageLevel: savedEncounter.triageLevel,
                chiefComplaint: savedEncounter.chiefComplaint,
                age: savedEncounter.age,
                vitals: savedEncounter.vitals,
                clinicId: clinicId,
                timestamp: new Date(),
                message: `🚨 EMERGENCY: ${savedEncounter.patientName} (${savedEncounter.triageLevel}) assigned to you`,
            };

            // Emit to specific doctor's room
            io.to(`doctor_${assignedDoctor}`).emit('emergencyAssigned', notificationData);

            // Also emit to all doctors' dashboard for real-time counter
            io.emit('emergencyNotification', notificationData);

            res.status(201).json(savedEncounter);
        } catch (error) {
            console.error('Emergency intake error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // 2. Triage & Priority Queue - Clinic Scoped
    router.get('/queue', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            // Sorts by triageLevel (P1 -> P5), then by creation time (FIFO for the same priority)
            const queue = await EmergencyEncounter.find({ 
                clinicId, 
                status: 'Waiting' 
            })
                .populate('assignedDoctor', 'name department')
                .sort({ triageLevel: 1, createdAt: 1 });
            res.status(200).json(queue);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // 3. Real-time Bed Availability - Clinic Scoped
    router.get('/beds', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            let beds = await Bed.find({ 
                clinicId, 
                isEmergencyEligible: true 
            });
            
            if (beds.length === 0) {
                const defaultBeds = [
                    { bedNumber: 'E1', roomNumber: 'ER-1', roomType: 'General Ward', status: 'Available', isEmergencyEligible: true, clinicId: clinicId },
                    { bedNumber: 'E2', roomNumber: 'ER-1', roomType: 'General Ward', status: 'Occupied', isEmergencyEligible: true, clinicId: clinicId },
                    { bedNumber: 'E3', roomNumber: 'ER-2', roomType: 'ICU', status: 'Available', isEmergencyEligible: true, clinicId: clinicId },
                    { bedNumber: 'E4', roomNumber: 'ER-2', roomType: 'ICU', status: 'Under Cleaning', isEmergencyEligible: true, clinicId: clinicId },
                    { bedNumber: 'E5', roomNumber: 'ER-3', roomType: 'Private Room', status: 'Reserved', isEmergencyEligible: true, clinicId: clinicId }
                ];
                await Bed.insertMany(defaultBeds);
                beds = await Bed.find({ 
                    clinicId, 
                    isEmergencyEligible: true 
                });
            }
            res.status(200).json(beds);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Update Bed Status - Clinic Scoped
    router.put('/beds/:id/status', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            const bed = await Bed.findOne({ 
                _id: req.params.id, 
                clinicId 
            });
            
            if (!bed) {
                return res.status(404).json({ message: 'Bed not found in this clinic' });
            }
            
            bed.status = req.body.status;
            await bed.save();
            
            // Broadcast bed status change to all terminals
            if (io) io.to(`clinic_${clinicId}_emergency`).emit('bedStatusUpdated', { 
                bedId: req.params.id, 
                status: req.body.status,
                clinicId 
            });
            res.status(200).json({ message: 'Bed status updated successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // GET single emergency encounter - Clinic Scoped
    router.get('/:id', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            const encounter = await EmergencyEncounter.findOne({ 
                _id: req.params.id, 
                clinicId 
            })
                .populate('assignedDoctor', 'name department');
            
            if (!encounter) {
                return res.status(404).json({ message: 'Emergency encounter not found' });
            }
            res.json(encounter);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // UPDATE emergency status - Clinic Scoped
    router.patch('/:id/status', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            const { status, allocatedBed } = req.body;
            
            const encounter = await EmergencyEncounter.findOne({ 
                _id: req.params.id, 
                clinicId 
            });
            
            if (!encounter) {
                return res.status(404).json({ message: 'Emergency encounter not found' });
            }
            
            if (status) encounter.status = status;
            if (allocatedBed !== undefined) encounter.allocatedBed = allocatedBed;
            
            await encounter.save();
            
            // Notify clinic staff
            if (io) io.to(`clinic_${clinicId}_emergency`).emit('emergencyStatusUpdated', {
                encounterId: encounter._id,
                status: encounter.status,
                clinicId
            });
            
            res.json(encounter);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // GET emergency stats - Clinic Scoped
    router.get('/stats/summary', auth, async (req, res) => {
        try {
            const clinicId = resolveClinicId(req);
            
            const [waiting, inTreatment, admitted, discharged] = await Promise.all([
                EmergencyEncounter.countDocuments({ clinicId, status: 'Waiting' }),
                EmergencyEncounter.countDocuments({ clinicId, status: 'In Treatment' }),
                EmergencyEncounter.countDocuments({ clinicId, status: 'Admitted' }),
                EmergencyEncounter.countDocuments({ clinicId, status: 'Discharged' }),
            ]);
            
            const byTriage = await EmergencyEncounter.aggregate([
                { $match: { clinicId } },
                { $group: { _id: '$triageLevel', count: { $sum: 1 } } }
            ]);
            
            const triageMap = {};
            byTriage.forEach(t => { triageMap[t._id] = t.count; });
            
            res.json({
                waiting,
                inTreatment,
                admitted,
                discharged,
                total: waiting + inTreatment + admitted + discharged,
                byTriage: triageMap
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};