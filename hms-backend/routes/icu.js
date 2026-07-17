import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';
import ICUBed from '../models/ICUBed.js';
import ICUAdmission from '../models/ICUAdmission.js';
import ICUCharges from '../models/ICUCharges.js';
import VitalLog from '../models/VitalLog.js';
import VentilatorLog from '../models/VentilatorLog.js';
import Admission from '../models/Admission.js';
import Patient from '../models/Patient.js';
import Billing from '../models/Billing.js';
import User from '../models/User.js';

const router = express.Router();

// ── Helper ──
function resolveClinicId(req) {
  return req.body?.clinicId || req.query?.clinicId || req.user?.clinicId || 'default';
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

// CREATE ICU bed (admin only)
router.post('/beds', auth, roleCheck('admin'), async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const bed = await ICUBed.create({ ...req.body, clinicId });
    res.status(201).json({ success: true, bed });
  } catch (err) {
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
    const bed = await ICUBed.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, message: 'Bed deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== ICU ADMISSION ====================

// ADMIT patient to ICU
router.post('/admit', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const { 
      patientId, bedId, reasonForICU, diagnosis, severity, 
      attendingDoctor, assignedReceptionist, notes 
    } = req.body;
    
    if (!patientId) return res.status(400).json({ success: false, message: 'Patient ID required' });
    if (!bedId) return res.status(400).json({ success: false, message: 'Bed ID required' });
    
    // Check if bed is available
    const bed = await ICUBed.findOne({ _id: bedId, clinicId });
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    if (bed.status !== 'Available') {
      return res.status(400).json({ success: false, message: 'Bed is not available' });
    }
    
    // Check if patient exists
    const patient = await Patient.findOne({ _id: patientId, clinicIds: clinicId });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    
    // Check if patient already in ICU
    const existingICU = await ICUAdmission.findOne({ 
      clinicId, patientId, status: 'Active' 
    });
    if (existingICU) {
      return res.status(400).json({ success: false, message: 'Patient already in ICU' });
    }
    
    // Check if patient already admitted
    let admission = await Admission.findOne({ patient: patientId, status: 'Admitted', clinicId });
    if (!admission) {
      admission = await Admission.create({
        clinicId,
        patient: patientId,
        doctor: attendingDoctor || undefined,
        admittedBy: req.user.id,
        admittedByName: req.user.name,
        roomType: 'ICU',
        status: 'Admitted',
        notes: `ICU Admission: ${reasonForICU}`,
        isICU: true,
      });
    } else {
      admission.isICU = true;
      admission.roomType = 'ICU';
      await admission.save();
    }
    
    // Create ICU admission
    const doctor = await User.findById(attendingDoctor);
    const receptionist = await User.findById(assignedReceptionist);
    
    const icuAdmission = await ICUAdmission.create({
      clinicId,
      patientId,
      bedId,
      admissionIdRef: admission._id,
      reasonForICU,
      diagnosis,
      severity: severity || 'Moderate',
      attendingDoctor: attendingDoctor || undefined,
      attendingDoctorName: doctor?.name || '',
      admittingDoctor: req.user.id,
      admittingDoctorName: req.user.name,
      assignedReceptionist: assignedReceptionist || undefined,
      assignedReceptionistName: receptionist?.name || '',
      status: 'Active',
      admissionDate: new Date(),
      notes,
    });
    
    // Update bed
    bed.status = 'Occupied';
    bed.patientId = patientId;
    bed.admissionId = admission._id;
    bed.admissionDate = new Date();
    bed.assignedDoctor = attendingDoctor || undefined;
    bed.assignedReceptionist = assignedReceptionist || undefined;
    await bed.save();
    
    // Update admission with ICU reference
    admission.icuAdmissionId = icuAdmission._id;
    admission.icuBedId = bed._id;
    admission.icuAdmissionDate = new Date();
    await admission.save();
    
    const populated = await ICUAdmission.findById(icuAdmission._id)
      .populate('patientId', 'name patientId phone')
      .populate('bedId', 'bedNumber bedType')
      .populate('attendingDoctor', 'name')
      .populate('assignedReceptionist', 'name');
    
    res.status(201).json({ success: true, admission: populated });
  } catch (err) {
    console.error('ICU admission error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DISCHARGE from ICU
router.post('/discharge/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const icuAdmission = await ICUAdmission.findOne({ _id: req.params.id, clinicId, status: 'Active' });
    if (!icuAdmission) {
      return res.status(404).json({ success: false, message: 'Active ICU admission not found' });
    }
    
    // Calculate charges before discharge
    const charges = await calculateICUCharges(icuAdmission._id);
    
    icuAdmission.status = 'Discharged';
    icuAdmission.dischargeDate = new Date();
    icuAdmission.totalCharges = charges.total;
    await icuAdmission.save();
    
    // Update bed
    const bed = await ICUBed.findOne({ _id: icuAdmission.bedId, clinicId });
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
    
    // Update admission
    const admission = await Admission.findOne({ _id: icuAdmission.admissionIdRef, clinicId });
    if (admission) {
      admission.isICU = false;
      admission.icuBedId = null;
      admission.icuDischargeDate = new Date();
      admission.icuTotalCharges = charges.total;
      await admission.save();
    }
    
    // Create or update billing
    await createICUBill(icuAdmission, charges);
    
    res.json({ 
      success: true, 
      message: 'Patient discharged from ICU',
      charges,
      admission: icuAdmission,
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
    const admissions = await ICUAdmission.find({ clinicId, status: 'Active' })
      .populate('patientId', 'name patientId phone age gender')
      .populate('bedId', 'bedNumber bedType')
      .populate('attendingDoctor', 'name department')
      .populate('assignedReceptionist', 'name')
      .sort({ admissionDate: -1 });
    
    res.json({ success: true, admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET ICU admission by ID
router.get('/admissions/:id', auth, async (req, res) => {
  try {
    const clinicId = resolveClinicId(req);
    const admission = await ICUAdmission.findOne({ _id: req.params.id, clinicId })
      .populate('patientId', 'name patientId phone age gender bloodGroup')
      .populate('bedId', 'bedNumber bedType equipment')
      .populate('attendingDoctor', 'name department')
      .populate('assignedReceptionist', 'name')
      .populate('admissionIdRef', 'admissionId');
    
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
    const admissions = await ICUAdmission.find({ clinicId, patientId: req.params.patientId })
      .populate('bedId', 'bedNumber bedType')
      .populate('attendingDoctor', 'name')
      .sort({ admissionDate: -1 });
    
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
    
    await ICUAdmission.findOneAndUpdate(
      { patientId, status: 'Active', clinicId },
      { ventilatorUsed: true, ventilatorStartDate: new Date() }
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
    
    await ICUBed.findOneAndUpdate(
      { _id: ventilator.bedId, clinicId },
      { ventilatorInUse: false, ventilatorStartTime: null }
    );
    
    await ICUAdmission.findOneAndUpdate(
      { patientId: ventilator.patientId, status: 'Active', clinicId },
      { ventilatorEndDate: new Date() }
    );
    
    res.json({ success: true, ventilator });
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
    
    const [totalBeds, availableBeds, occupiedBeds, maintenanceBeds, activeAdmissions] = await Promise.all([
      ICUBed.countDocuments({ clinicId }),
      ICUBed.countDocuments({ clinicId, status: 'Available' }),
      ICUBed.countDocuments({ clinicId, status: 'Occupied' }),
      ICUBed.countDocuments({ clinicId, status: 'Maintenance' }),
      ICUAdmission.countDocuments({ clinicId, status: 'Active' }),
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
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function calculateICUCharges(icuAdmissionId) {
  const admission = await ICUAdmission.findById(icuAdmissionId);
  if (!admission) throw new Error('ICU admission not found');
  
  const clinicId = admission.clinicId;
  const bed = await ICUBed.findById(admission.bedId);
  
  const chargesConfig = await ICUCharges.findOne({ clinicId, isActive: true }).sort({ effectiveDate: -1 });
  
  const now = new Date();
  const admissionDate = new Date(admission.admissionDate);
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
    patientId: admission.patientId, 
    isActive: false,
    endTime: { $ne: null }
  });
  const ventilatorCharges = ventilatorLogs.reduce((sum, v) => sum + (v.totalCharge || 0), 0);
  
  const activeVentilator = await VentilatorLog.findOne({ 
    patientId: admission.patientId, 
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
  const patientId = icuAdmission.patientId;
  
  let bill = await Billing.findOne({ patient: patientId, clinicId, paymentStatus: 'Pending' });
  
  if (!bill) {
    bill = new Billing({
      clinicId,
      patient: patientId,
      generatedBy: icuAdmission.attendingDoctor || icuAdmission.admittingDoctor,
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
  
  const existingICUItems = bill.items.filter(i => i.category === 'ICU');
  bill.items = bill.items.filter(i => i.category !== 'ICU');
  
  if (charges.breakdown.baseCharges > 0) {
    bill.items.push({
      description: `ICU Bed Rent (${icuAdmission.bedId?.bedType || 'General ICU'}) - ${charges.days} days`,
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
  
  icuAdmission.billingId = bill._id;
  await icuAdmission.save();
  
  return bill;
}

export default router;