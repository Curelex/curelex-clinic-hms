// hms-backend/routes/icu.js
import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import ICUBed from '../models/ICUBed.js';
import ICUCharges from '../models/ICUCharges.js';
import VitalLog from '../models/VitalLog.js';
import VentilatorLog from '../models/VentilatorLog.js';
import Admission from '../models/Admission.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import User from '../models/User.js';
import ClinicRoomConfig from '../models/ClinicRoomConfig.js';
import Inventory from '../models/Inventory.js';
const router = express.Router();

// ── Helper ──
function resolveClinicId(req) {
  return req.body?.clinicId || req.query?.clinicId || req.user?.clinicId || 'default';
}

// ── Helper: Update ICU room availability in ClinicRoomConfig ──
async function updateICURoomAvailability(clinicId, increment) {
  // increment: -1 for occupy, +1 for release
  let config = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
  
  if (!config) {
    // Create default ICU config if it doesn't exist
    config = await ClinicRoomConfig.create({
      clinicId,
      roomType: 'ICU',
      dailyRate: 4000,
      totalRooms: 4,
      availableRooms: 4,
      icuDailyRate: 4000,
      icuVentilatorRate: 1500,
      icuMonitoringRate: 500,
      icuDialysisRate: 3000,
      icuBedType: 'General ICU',
    });
  }
  
  // Update available rooms
  const newAvailable = Math.max(0, config.availableRooms + increment);
  config.availableRooms = newAvailable;
  await config.save();
  
  return config;
}

// ==================== ICU BED MANAGEMENT ====================

// GET all ICU beds
router.get('/beds', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { status, bedType } = req.query;
    
    const query = { clinicId };
    if (status) query.status = status;
    if (bedType) query.bedType = bedType;
    
    const beds = await ICUBed.find(query)
      .populate('patientId', 'name patientId phone')
      .populate('assignedDoctor', 'name')
      .populate('assignedReceptionist', 'name')
      .sort({ bedNumber: 1 });
    
    res.json({ success: true, beds });
  } catch (err) {
    console.error('GET /beds error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET available ICU beds
router.get('/beds/available', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { bedType } = req.query;
    
    const query = { clinicId, status: 'Available' };
    if (bedType) query.bedType = bedType;
    
    const beds = await ICUBed.find(query).sort({ bedNumber: 1 });
    res.json({ success: true, beds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single ICU bed
router.get('/beds/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const bed = await ICUBed.findOne({ _id: req.params.id, clinicId })
      .populate('patientId', 'name patientId phone age gender')
      .populate('assignedDoctor', 'name department')
      .populate('assignedReceptionist', 'name');
    
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, bed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET available ICU rooms from ClinicRoomConfig
router.get('/rooms', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    // Get ICU room config
    let roomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
    
    if (!roomConfig) {
      // Create default if not exists
      roomConfig = await ClinicRoomConfig.create({
        clinicId,
        roomType: 'ICU',
        dailyRate: 4000,
        totalRooms: 4,
        availableRooms: 4,
        icuDailyRate: 4000,
        icuVentilatorRate: 1500,
        icuMonitoringRate: 500,
        icuDialysisRate: 3000,
        icuBedType: 'General ICU',
      });
    }
    
    // Generate room numbers based on totalRooms
    const totalRooms = roomConfig.totalRooms || 4;
    const rooms = [];
    
    // Get occupied bed room numbers
    const occupiedBeds = await ICUBed.find({ 
      clinicId, 
      status: 'Occupied' 
    }).select('roomNumber');
    
    const occupiedRoomNumbers = occupiedBeds.map(b => b.roomNumber);
    
    for (let i = 1; i <= totalRooms; i++) {
      const roomNumber = `ICU-${i}`;
      rooms.push({
        roomNumber,
        isAvailable: !occupiedRoomNumbers.includes(roomNumber),
        dailyRate: roomConfig.dailyRate,
      });
    }
    
    res.json({
      success: true,
      rooms,
      config: roomConfig,
      availableCount: roomConfig.availableRooms || 0,
      totalCount: roomConfig.totalRooms || 0,
    });
  } catch (err) {
    console.error('GET /rooms error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET room details by room number
router.get('/rooms/:roomNumber', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { roomNumber } = req.params;
    
    const config = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
    if (!config) {
      return res.status(404).json({ success: false, message: 'ICU room config not found' });
    }
    
    // Check if this room number is within totalRooms
    const roomIndex = parseInt(roomNumber.split('-')[1]) - 1;
    if (roomIndex >= config.totalRooms || roomIndex < 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    // Check if room has an occupied bed
    const occupiedBed = await ICUBed.findOne({ 
      clinicId, 
      roomNumber, 
      status: 'Occupied' 
    }).populate('patientId', 'name patientId');
    
    res.json({
      success: true,
      room: {
        roomNumber,
        isAvailable: !occupiedBed,
        occupiedBy: occupiedBed?.patientId || null,
        dailyRate: config.dailyRate,
        icuDailyRate: config.icuDailyRate || config.dailyRate,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CREATE ICU bed (admin only)
router.post('/beds', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    // Check if room number is valid
    const roomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
    if (!roomConfig) {
      return res.status(400).json({ 
        success: false, 
        message: 'ICU room config not found. Please set up ICU rooms first.' 
      });
    }
    
    // Validate room number exists in config
    const roomIndex = parseInt(req.body.roomNumber?.split('-')[1]) - 1;
    if (roomIndex >= roomConfig.totalRooms || roomIndex < 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid room number. Available rooms: ICU-1 to ICU-${roomConfig.totalRooms}` 
      });
    }
    
    // Check if bed number already exists
    const existingBed = await ICUBed.findOne({ 
      clinicId, 
      bedNumber: req.body.bedNumber 
    });
    if (existingBed) {
      return res.status(400).json({ 
        success: false, 
        message: `Bed ${req.body.bedNumber} already exists` 
      });
    }
    
    const bed = await ICUBed.create({ ...req.body, clinicId });
    
    res.status(201).json({ success: true, bed });
  } catch (err) {
    console.error('POST /beds error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE ICU bed
router.put('/beds/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const bed = await ICUBed.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, bed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE bed status
router.patch('/beds/:id/status', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { status } = req.body;
    
    const bed = await ICUBed.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { status },
      { new: true }
    );
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, bed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE ICU bed
router.delete('/beds/:id', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const bed = await ICUBed.findOne({ _id: req.params.id, clinicId });
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    
    // Don't allow deletion if bed is occupied
    if (bed.status === 'Occupied') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete an occupied bed. Please discharge the patient first.' 
      });
    }
    
    await ICUBed.findOneAndDelete({ _id: req.params.id, clinicId });
    
    res.json({ success: true, message: 'Bed deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.post('/admit', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { 
      patientId, bedId, reasonForICU, diagnosis, severity, 
      attendingDoctor, assignedReceptionist, notes 
    } = req.body;
    
    // ── Validate required fields ──
    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient ID required' 
      });
    }
    if (!bedId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bed ID required' 
      });
    }

    // ── Check if bed is available ──
    const bed = await ICUBed.findOne({ _id: bedId, clinicId });
    if (!bed) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bed not found' 
      });
    }
    if (bed.status !== 'Available') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bed is not available' 
      });
    }

    // ── Check if patient exists ──
    const patient = await Patient.findOne({ _id: patientId, clinicIds: clinicId });
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found in this clinic' 
      });
    }

    // ── Check if patient already has an active ICU admission ──
    const existingICU = await Admission.findOne({ 
      patient: patientId, 
      clinicId,
      isICU: true,
      status: 'Admitted' 
    });
    if (existingICU) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient already has an active ICU admission' 
      });
    }

    // ── Check ICU room availability in ClinicRoomConfig ──
    let roomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
    if (!roomConfig) {
      // Create default config if not exists
      roomConfig = await ClinicRoomConfig.create({
        clinicId,
        roomType: 'ICU',
        dailyRate: 4000,
        totalRooms: 4,
        availableRooms: 4,
        icuDailyRate: 4000,
        icuVentilatorRate: 1500,
        icuMonitoringRate: 500,
        icuDialysisRate: 3000,
        icuBedType: 'General ICU',
      });
    }

    // Check if rooms are available
    const updatedConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
    if (updatedConfig && updatedConfig.availableRooms <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No ICU rooms available. Please check room settings.' 
      });
    }

    // ── Get doctor and receptionist details ──
    const doctor = attendingDoctor ? await User.findById(attendingDoctor) : null;
    const receptionist = assignedReceptionist ? await User.findById(assignedReceptionist) : null;

    // ── Check if patient already has a general admission ──
    let admission = await Admission.findOne({ 
      patient: patientId, 
      status: 'Admitted', 
      clinicId 
    });

    if (!admission) {
      // ── Create NEW admission with ICU fields ──
      admission = await Admission.create({
        clinicId,
        patient: patientId,
        doctor: attendingDoctor || undefined,
        admittedBy: req.user.id,
        admittedByName: req.user.name,
        roomType: 'ICU',
        roomNumber: bed.roomNumber || '',
        roomRatePerDay: bed.baseDailyRate || 4000,
        status: 'Admitted',
        notes: notes || `ICU Admission: ${reasonForICU || 'Emergency ICU admission'}`,
        
        // ── ICU Fields ──
        isICU: true,
        icuBedId: bedId,
        icuAdmissionDate: new Date(),
        reasonForICU: reasonForICU || '',
        diagnosis: diagnosis || '',
        severity: severity || 'Moderate',
        icuAssignedReceptionist: assignedReceptionist || undefined,
        icuAssignedReceptionistName: receptionist?.name || '',
        
        // ── Ventilator fields ──
        ventilatorUsed: false,
        ventilatorStartDate: null,
        ventilatorEndDate: null,
        
        // ── Charges ──
        icuBaseCharges: 0,
        icuVentilatorCharges: 0,
        icuMonitoringCharges: 0,
        icuDialysisCharges: 0,
        icuEquipmentCharges: 0,
        icuTotalCharges: 0,
      });
    } else {
      // ── UPDATE existing admission to ICU ──
      admission.isICU = true;
      admission.roomType = 'ICU';
      admission.roomNumber = bed.roomNumber || '';
      admission.roomRatePerDay = bed.baseDailyRate || 4000;
      admission.icuBedId = bedId;
      admission.icuAdmissionDate = new Date();
      admission.reasonForICU = reasonForICU || admission.reasonForICU || '';
      admission.diagnosis = diagnosis || admission.diagnosis || '';
      admission.severity = severity || admission.severity || 'Moderate';
      admission.icuAssignedReceptionist = assignedReceptionist || admission.icuAssignedReceptionist;
      admission.icuAssignedReceptionistName = receptionist?.name || '';
      admission.doctor = attendingDoctor || admission.doctor;
      admission.notes = notes || admission.notes;
      await admission.save();
    }

    // ── Update bed ──
    bed.status = 'Occupied';
    bed.patientId = patientId;
    bed.admissionId = admission._id;
    bed.admissionDate = new Date();
    bed.assignedDoctor = attendingDoctor || undefined;
    bed.assignedReceptionist = assignedReceptionist || undefined;
    bed.reasonForICU = reasonForICU || '';
    bed.diagnosis = diagnosis || '';
    await bed.save();

    // ── Update patient status ──
    await Patient.findOneAndUpdate(
      { _id: patientId, clinicIds: clinicId }, 
      { status: 'Active' }
    );

    // ── Update: Decrease available ICU rooms in ClinicRoomConfig ──
    await ClinicRoomConfig.findOneAndUpdate(
      { clinicId, roomType: 'ICU' },
      { $inc: { availableRooms: -1 } }
    );

    // ── Populate the admission for response ──
    const populatedAdmission = await Admission.findById(admission._id)
      .populate('patient', 'name patientId phone age gender')
      .populate('doctor', 'name department')
      .populate('admittedBy', 'name')
      .populate('icuAssignedReceptionist', 'name');

    // ── Get updated room config ──
    const finalRoomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });

    // ── Send response ──
    res.status(201).json({ 
      success: true, 
      message: 'Patient admitted to ICU successfully',
      admission: populatedAdmission,
      bed: {
        _id: bed._id,
        bedNumber: bed.bedNumber,
        roomNumber: bed.roomNumber,
        bedType: bed.bedType,
        status: bed.status,
      },
      roomAvailability: {
        availableRooms: finalRoomConfig?.availableRooms || 0,
        totalRooms: finalRoomConfig?.totalRooms || 0,
      }
    });

  } catch (err) {
    console.error('❌ ICU admission error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
});

// hms-backend/routes/icu.js - DISCHARGE endpoint

router.post('/discharge/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    // ── Find the ICU admission (using Admission model) ──
    const admission = await Admission.findOne({ 
      _id: req.params.id, 
      clinicId, 
      isICU: true,
      status: 'Admitted' 
    });

    if (!admission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Active ICU admission not found' 
      });
    }

    // ── Calculate charges ──
    const charges = await calculateICUCharges(admission);

    // ── Update admission ──
    admission.status = 'Discharged';
    admission.dischargeDate = new Date();
    admission.icuDischargeDate = new Date();
    admission.icuTotalCharges = charges.total;
    admission.ventilatorUsed = false;
    admission.ventilatorEndDate = new Date();
    await admission.save();

    // ── Update bed ──
    const bed = await ICUBed.findOne({ _id: admission.icuBedId, clinicId });
    if (bed) {
      bed.status = 'Available';
      bed.patientId = null;
      bed.admissionId = null;
      bed.assignedDoctor = null;
      bed.assignedReceptionist = null;
      bed.ventilatorInUse = false;
      bed.ventilatorStartTime = null;
      await bed.save();
    }

    // ── Update room availability ──
    await updateICURoomAvailability(clinicId, 1);

    // ── Create billing ──
    await createICUBill(admission, charges);

    res.json({ 
      success: true, 
      message: 'Patient discharged from ICU',
      charges,
      admission,
    });
  } catch (err) {
    console.error('ICU discharge error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// GET all active ICU admissions
router.get('/admissions/active', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const admissions = await Admission.find({ clinicId, isICU: true, status: 'Admitted' })
      .populate('patient', 'name patientId phone age gender')
      .populate('icuBedId', 'bedNumber bedType')
      .populate('doctor', 'name department')
      .populate('icuAssignedReceptionist', 'name')
      .sort({ icuAdmissionDate: -1 });
    
    // ── Add latest vitals to each admission ──
    const admissionsWithVitals = await Promise.all(
      admissions.map(async (admission) => {
        const latestVitals = await VitalLog.findOne({ 
          clinicId, 
          patientId: admission.patient._id 
        }).sort({ createdAt: -1 });
        
        return {
          ...admission.toObject(),
          latestVitals: latestVitals || null,
        };
      })
    );
    
    res.json({ success: true, admissions: admissionsWithVitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ICU admission by ID
router.get('/admissions/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const admission = await Admission.findOne({ _id: req.params.id, clinicId })
      .populate('patient', 'name patientId phone age gender bloodGroup')
      .populate('icuBedId', 'bedNumber bedType equipment')
      .populate('doctor', 'name department')
      .populate('icuAssignedReceptionist', 'name');
    
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });
    res.json({ success: true, admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ICU admissions by patient
router.get('/admissions/patient/:patientId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const admissions = await Admission.find({ clinicId, patient: req.params.patientId, isICU: true })
      .populate('icuBedId', 'bedNumber bedType')
      .populate('doctor', 'name')
      .sort({ icuAdmissionDate: -1 });
    
    res.json({ success: true, admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== VITAL LOGS ====================

// POST vital log (receptionist or doctor can log)
router.post('/vitals', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { 
      patientId, bedId, admissionId,
      heartRate, systolicBP, diastolicBP, spo2, temperature, respiratoryRate,
      gcsEye, gcsVerbal, gcsMotor, rassScore, painScore,
      urineOutput, fluidBalance, notes, isAutoLogged 
    } = req.body;
    
    if (!patientId || !bedId) {
      return res.status(400).json({ success: false, message: 'Patient ID and Bed ID required' });
    }
    
    // Get monitoring charge rate
    const charges = await ICUCharges.findOne({ clinicId, isActive: true }).sort({ effectiveDate: -1 });
    const monitoringRate = charges?.monitoringRatePerHour || 50;
    
    const vitals = await VitalLog.create({
      clinicId,
      patientId,
      bedId,
      admissionId: admissionId || undefined,
      heartRate,
      systolicBP,
      diastolicBP,
      spo2,
      temperature,
      respiratoryRate,
      gcsEye,
      gcsVerbal,
      gcsMotor,
      rassScore,
      painScore,
      urineOutput,
      fluidBalance,
      loggedBy: req.user.id,
      loggedByName: req.user.name,
      loggedByRole: req.user.role,
      notes,
      isAutoLogged: isAutoLogged || false,
      monitoringCharge: monitoringRate,
    });
    
    await ICUBed.findOneAndUpdate(
      { _id: bedId, clinicId },
      { $set: { lastVitalTime: new Date() } }
    );
    
    res.status(201).json({ success: true, vitals });
  } catch (err) {
    console.error('Vital log error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET vitals by patient
router.get('/vitals/patient/:patientId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { limit = 50 } = req.query;
    
    const vitals = await VitalLog.find({ clinicId, patientId: req.params.patientId })
      .populate('loggedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    
    res.json({ success: true, vitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET latest vitals by patient
router.get('/vitals/patient/:patientId/latest', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const vitals = await VitalLog.findOne({ clinicId, patientId: req.params.patientId })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, vitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET vitals by bed
router.get('/vitals/bed/:bedId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { limit = 50 } = req.query;
    
    const vitals = await VitalLog.find({ clinicId, bedId: req.params.bedId })
      .populate('patientId', 'name')
      .populate('loggedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    
    res.json({ success: true, vitals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== VENTILATOR LOGS ====================

// START ventilator
router.post('/ventilator/start', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { patientId, bedId, mode, fio2, peep, tidalVolume, rate, pressureSupport, notes } = req.body;
    
    if (!patientId || !bedId || !mode) {
      return res.status(400).json({ success: false, message: 'Patient ID, Bed ID, and Mode required' });
    }
    
    const existing = await VentilatorLog.findOne({ 
      clinicId, patientId, isActive: true 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ventilator already active for this patient' });
    }
    
    const charges = await ICUCharges.findOne({ clinicId, isActive: true }).sort({ effectiveDate: -1 });
    const ratePerHour = charges?.ventilatorRatePerHour || 150;
    
    const ventilatorLog = await VentilatorLog.create({
      clinicId,
      patientId,
      bedId,
      mode,
      fio2: fio2 || 21,
      peep: peep || 0,
      tidalVolume: tidalVolume || 0,
      rate: rate || 0,
      pressureSupport: pressureSupport || 0,
      startTime: new Date(),
      isActive: true,
      ratePerHour,
      loggedBy: req.user.id,
      loggedByName: req.user.name,
      loggedByRole: req.user.role,
      notes,
    });
    
    await ICUBed.findOneAndUpdate(
      { _id: bedId, clinicId },
      { ventilatorInUse: true, ventilatorStartTime: new Date() }
    );
    
    await Admission.findOneAndUpdate(
      { patient: patientId, status: 'Admitted', isICU: true, clinicId },
      { 
        ventilatorUsed: true, 
        ventilatorStartDate: new Date() 
      }
    );
    
    res.status(201).json({ success: true, ventilator: ventilatorLog });
  } catch (err) {
    console.error('Ventilator start error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// STOP ventilator
router.post('/ventilator/stop/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const ventilator = await VentilatorLog.findOne({ _id: req.params.id, clinicId });
    if (!ventilator) {
      return res.status(404).json({ success: false, message: 'Ventilator log not found' });
    }
    
    if (!ventilator.isActive) {
      return res.status(400).json({ success: false, message: 'Ventilator already stopped' });
    }
    
    ventilator.endTime = new Date();
    ventilator.isActive = false;
    
    const diffMs = ventilator.endTime - ventilator.startTime;
    ventilator.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    ventilator.totalCharge = Math.round(ventilator.totalHours * ventilator.ratePerHour);
    
    await ventilator.save();
    
    // Update ICUBed
    await ICUBed.findOneAndUpdate(
      { _id: ventilator.bedId, clinicId },
      { ventilatorInUse: false, ventilatorStartTime: null }
    );
    
    // CRITICAL: Update Admission - set ventilatorUsed to false
    const updatedAdmission = await Admission.findOneAndUpdate(
      { 
        patient: ventilator.patientId, 
        status: 'Admitted', 
        isICU: true,
        clinicId 
      },
      { 
        $set: { 
          ventilatorUsed: false,      // KEY FIX: Set to false
          ventilatorEndDate: new Date() 
        }
      },
      { new: true }
    );
    
    console.log('✅ Ventilator stopped:', {
      ventilatorId: ventilator._id,
      patientId: ventilator.patientId,
      ventilatorUsed: updatedAdmission?.ventilatorUsed,
      totalHours: ventilator.totalHours,
      totalCharge: ventilator.totalCharge
    });
    
    res.json({ 
      success: true, 
      ventilator,
      admission: updatedAdmission
    });
  } catch (err) {
    console.error('Ventilator stop error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ventilator logs by patient
router.get('/ventilator/patient/:patientId', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const logs = await VentilatorLog.find({ clinicId, patientId: req.params.patientId })
      .sort({ createdAt: -1 });
    
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET active ventilator logs
router.get('/ventilator/active', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const logs = await VentilatorLog.find({ clinicId, isActive: true })
      .populate('patientId', 'name patientId')
      .populate('bedId', 'bedNumber')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ICU CHARGES SETTINGS ====================

// GET current ICU charges
router.get('/charges', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const charges = await ICUCharges.findOne({ clinicId, isActive: true })
      .sort({ effectiveDate: -1 });
    
    if (!charges) {
      return res.json({ 
        success: true, 
        charges: {
          generalICU: 4000,
          cardiacICU: 5000,
          pediatricICU: 4500,
          neuroICU: 5500,
          surgicalICU: 4800,
          medicalICU: 4200,
          ventilatorRatePerHour: 150,
          ventilatorRatePerDay: 1500,
          monitoringRatePerHour: 50,
          monitoringRatePerDay: 500,
          dialysisRatePerSession: 3000,
          specialEquipment: [],
        }
      });
    }
    
    res.json({ success: true, charges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE ICU charges (admin only)
router.put('/charges', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    await ICUCharges.updateMany(
      { clinicId, isActive: true },
      { isActive: false }
    );
    
    const charges = await ICUCharges.create({
      clinicId,
      ...req.body,
      isActive: true,
      effectiveDate: new Date(),
      updatedBy: req.user.id,
      updatedByName: req.user.name,
    });
    
    res.json({ success: true, charges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET charges history
router.get('/charges/history', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const charges = await ICUCharges.find({ clinicId })
      .sort({ effectiveDate: -1 });
    
    res.json({ success: true, charges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ICU STATS ====================

router.get('/stats', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    
    // Get ICU room config
    const roomConfig = await ClinicRoomConfig.findOne({ clinicId, roomType: 'ICU' });
    
    const [totalBeds, availableBeds, occupiedBeds, maintenanceBeds, activeAdmissions] = await Promise.all([
      ICUBed.countDocuments({ clinicId }),
      ICUBed.countDocuments({ clinicId, status: 'Available' }),
      ICUBed.countDocuments({ clinicId, status: 'Occupied' }),
      ICUBed.countDocuments({ clinicId, status: 'Maintenance' }),
      Admission.countDocuments({ clinicId, isICU: true, status: 'Admitted' }),
    ]);
    
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    
    const byBedType = await ICUBed.aggregate([
      { $match: { clinicId } },
      { $group: { _id: '$bedType', total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] } } } }
    ]);
    
    const activeVentilators = await VentilatorLog.countDocuments({ clinicId, isActive: true });
    
    res.json({
      success: true,
      stats: {
        totalBeds,
        availableBeds,
        occupiedBeds,
        maintenanceBeds,
        activeAdmissions,
        occupancyRate,
        byBedType,
        activeVentilators,
        // Add room config info
        roomConfig: {
          availableRooms: roomConfig?.availableRooms || 0,
          totalRooms: roomConfig?.totalRooms || 0,
          dailyRate: roomConfig?.dailyRate || 4000,
          icuDailyRate: roomConfig?.icuDailyRate || 4000,
          icuVentilatorRate: roomConfig?.icuVentilatorRate || 1500,
          icuMonitoringRate: roomConfig?.icuMonitoringRate || 500,
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function calculateICUCharges(admissionId) {
  const admission = await Admission.findById(admissionId);
  if (!admission) throw new Error('ICU admission not found');
  
  const clinicId = admission.clinicId;
  const bed = await ICUBed.findById(admission.icuBedId);
  
  const chargesConfig = await ICUCharges.findOne({ clinicId, isActive: true }).sort({ effectiveDate: -1 });
  
  const now = new Date();
  const admissionDate = new Date(admission.icuAdmissionDate || admission.admissionDate);
  const days = Math.max(1, Math.ceil((now - admissionDate) / (1000 * 60 * 60 * 24)));
  
  let bedRate = 4000;
  if (bed) {
    switch(bed.bedType) {
      case 'Cardiac ICU': bedRate = chargesConfig?.cardiacICU || 5000; break;
      case 'Pediatric ICU': bedRate = chargesConfig?.pediatricICU || 4500; break;
      case 'Neuro ICU': bedRate = chargesConfig?.neuroICU || 5500; break;
      case 'Surgical ICU': bedRate = chargesConfig?.surgicalICU || 4800; break;
      case 'Medical ICU': bedRate = chargesConfig?.medicalICU || 4200; break;
      default: bedRate = chargesConfig?.generalICU || 4000;
    }
  }
  
  const baseCharges = days * bedRate;
  
  const ventilatorLogs = await VentilatorLog.find({ 
    patientId: admission.patient, 
    isActive: false,
    endTime: { $ne: null }
  });
  const ventilatorCharges = ventilatorLogs.reduce((sum, v) => sum + (v.totalCharge || 0), 0);
  
  const activeVentilator = await VentilatorLog.findOne({ 
    patientId: admission.patient, 
    isActive: true 
  });
  let activeVentilatorCharge = 0;
  if (activeVentilator) {
    const diffMs = now - activeVentilator.startTime;
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    activeVentilatorCharge = hours * (activeVentilator.ratePerHour || 150);
  }
  
  const totalVentilatorCharges = ventilatorCharges + activeVentilatorCharge;
  
  const monitoringRate = chargesConfig?.monitoringRatePerDay || 500;
  const monitoringCharges = days * monitoringRate;
  
  const dialysisCharges = 0;
  
  const total = baseCharges + totalVentilatorCharges + monitoringCharges + dialysisCharges;
  
  return {
    days,
    bedRate,
    baseCharges,
    ventilatorCharges: totalVentilatorCharges,
    monitoringCharges,
    dialysisCharges,
    total,
    breakdown: {
      baseCharges,
      ventilatorCharges: totalVentilatorCharges,
      monitoringCharges,
      dialysisCharges,
    }
  };
}

async function createICUBill(icuAdmission, charges) {
  const clinicId = icuAdmission.clinicId;
  const patientId = icuAdmission.patient;
  
  let bill = await Billing.findOne({ patient: patientId, clinicId, paymentStatus: 'Pending' });
  
  if (!bill) {
    bill = new Billing({
      clinicId,
      patient: patientId,
      generatedBy: icuAdmission.doctor,
      paymentStatus: 'Pending',
      totalAmount: 0,
    });
  }
  
  bill.icuCharges = {
    bedRent: charges.breakdown.baseCharges,
    ventilator: charges.breakdown.ventilatorCharges,
    monitoring: charges.breakdown.monitoringCharges,
    dialysis: charges.breakdown.dialysisCharges || 0,
    equipment: 0,
    total: charges.total,
  };
  bill.icuDays = charges.days;
  bill.icuDischargeDate = new Date();
  
  // Remove existing ICU items
  bill.items = bill.items.filter(i => i.category !== 'ICU');
  
  if (charges.breakdown.baseCharges > 0) {
    const bed = await ICUBed.findById(icuAdmission.icuBedId);
    bill.items.push({
      description: `ICU Bed Rent (${bed?.bedType || 'General ICU'}) - ${charges.days} days`,
      category: 'ICU',
      quantity: charges.days,
      unitPrice: charges.bedRate,
      total: charges.breakdown.baseCharges,
      addedByName: 'ICU System',
    });
  }
  
  if (charges.breakdown.ventilatorCharges > 0) {
    bill.items.push({
      description: `Ventilator Usage - ${charges.days} days`,
      category: 'ICU',
      quantity: charges.days,
      unitPrice: Math.round(charges.breakdown.ventilatorCharges / charges.days),
      total: charges.breakdown.ventilatorCharges,
      addedByName: 'ICU System',
    });
  }
  
  if (charges.breakdown.monitoringCharges > 0) {
    bill.items.push({
      description: `ICU Monitoring - ${charges.days} days`,
      category: 'ICU',
      quantity: charges.days,
      unitPrice: Math.round(charges.breakdown.monitoringCharges / charges.days),
      total: charges.breakdown.monitoringCharges,
      addedByName: 'ICU System',
    });
  }
  
  bill.subtotal = bill.items.reduce((sum, i) => sum + (i.total || 0), 0);
  bill.totalAmount = bill.subtotal - (bill.discount || 0) + (bill.subtotal * (bill.tax || 0)) / 100;
  
  await bill.save();
  
  icuAdmission.bill = bill._id;
  await icuAdmission.save();
  
  return bill;
}

export default router;