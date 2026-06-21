// hms-backend/controllers/prescriptionController.js
import Prescription from '../models/Prescription.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';
import Token from '../models/Token.js';
import Medicine from '../models/Medicine.js';

// ── Create Prescription ──
export const createPrescription = async (req, res) => {
  try {
    const { 
      patientId, doctorId, appointmentId, tokenId,
      medicines, notes, diagnosis, chiefComplaint,
      followUpDate, followUpInstructions, tests,
      createdBy, createdByRole
    } = req.body;
    
    const clinicId = req.user?.clinicId || req.body.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    // Validate patient
    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Validate doctor
    const doctor = await User.findOne({ _id: doctorId, clinicId });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Process medicines
    const processedMedicines = await Promise.all((medicines || []).map(async (med) => {
      if (med.medicineId) {
        const medicine = await Medicine.findOne({ _id: med.medicineId, clinicId });
        if (medicine) {
          return {
            medicineId: medicine._id,
            name: medicine.name,
            dosage: med.dosage || '1 tablet',
            frequency: med.frequency || 'Once daily',
            duration: med.duration || '5 days',
            strength: medicine.strength || '',
            instructions: med.instructions || '',
            quantity: med.quantity || 1,
          };
        }
      }
      return {
        medicineId: null,
        name: med.name || 'Unknown Medicine',
        dosage: med.dosage || '1 tablet',
        frequency: med.frequency || 'Once daily',
        duration: med.duration || '5 days',
        strength: med.strength || '',
        instructions: med.instructions || '',
        quantity: med.quantity || 1,
      };
    }));

    // Create prescription
    const prescription = await Prescription.create({
      patientId: patient._id,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      doctorId: doctor._id,
      doctorName: doctor.name,
      doctorSpecialization: doctor.department || doctor.specialization,
      clinicId,
      appointmentId: appointmentId || null,
      tokenId: tokenId || null,
      medicines: processedMedicines,
      notes: notes || '',
      diagnosis: diagnosis || '',
      chiefComplaint: chiefComplaint || '',
      followUpDate: followUpDate || null,
      followUpInstructions: followUpInstructions || '',
      tests: tests || [],
      status: 'active',
      createdBy: createdBy || req.user.id,
      createdByRole: createdByRole || req.user?.role || 'doctor',
    });

    await prescription.populate('patientId', 'name patientId phone');
    await prescription.populate('doctorId', 'name department');
    await prescription.populate('medicines.medicineId', 'name dosageForm strength');

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription,
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Prescriptions by Patient ──
export const getPrescriptionsByPatient = async (req, res) => {
  try {
    const patientId = req.params.id;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const prescriptions = await Prescription.find({
      patientId: patient._id,
      clinicId,
    })
      .populate('doctorId', 'name specialization department')
      .populate('medicines.medicineId', 'name dosageForm strength')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: prescriptions.length,
      prescriptions,
    });
  } catch (error) {
    console.error('Get prescriptions by patient error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── ✅ FIXED: Get Prescriptions by Doctor ──
export const getPrescriptionsByDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const clinicId = req.user?.clinicId;

    

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    // Check if doctor exists (don't require role: 'doctor' - just check by ID and clinic)
    const doctor = await User.findOne({ _id: doctorId, clinicId });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Find all prescriptions for this doctor
    const prescriptions = await Prescription.find({
      doctorId: doctor._id,
      clinicId,
    })
      .populate('patientId', 'name patientId phone email')
      .populate('medicines.medicineId', 'name dosageForm strength')
      .sort({ createdAt: -1 });

    

    res.json({
      success: true,
      count: prescriptions.length,
      prescriptions,
    });
  } catch (error) {
    console.error('Get prescriptions by doctor error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Single Prescription ──
export const getPrescriptionById = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      clinicId,
    })
      .populate('patientId', 'name patientId phone dob gender bloodGroup')
      .populate('doctorId', 'name specialization department')
      .populate('medicines.medicineId', 'name dosageForm strength');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    res.json({ success: true, prescription });
  } catch (error) {
    console.error('Get prescription by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update Prescription ──
export const updatePrescription = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      clinicId,
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const allowedFields = [
      'medicines', 'notes', 'diagnosis', 'chiefComplaint',
      'followUpDate', 'followUpInstructions', 'tests', 'status'
    ];

    const updates = req.body;
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        prescription[field] = updates[field];
      }
    });

    prescription.updatedBy = req.user.id;
    await prescription.save();
    await prescription.populate('medicines.medicineId', 'name dosageForm strength');

    res.json({
      success: true,
      message: 'Prescription updated successfully',
      prescription,
    });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update Prescription Status ──
export const updatePrescriptionStatus = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const { status } = req.body;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const validStatuses = ['draft', 'active', 'dispensed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const prescription = await Prescription.findOneAndUpdate(
      { _id: prescriptionId, clinicId },
      { $set: { status, updatedBy: req.user.id } },
      { new: true }
    )
      .populate('patientId', 'name patientId')
      .populate('doctorId', 'name');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    res.json({
      success: true,
      message: `Prescription status updated to ${status}`,
      prescription,
    });
  } catch (error) {
    console.error('Update prescription status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete Prescription ──
export const deletePrescription = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      clinicId,
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (!['draft', 'active'].includes(prescription.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete prescription that is already dispensed or completed' 
      });
    }

    await prescription.deleteOne();
    res.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Prescription Stats ──
export const getPrescriptionStats = async (req, res) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const [total, active, dispensed, completed, cancelled, draft] = await Promise.all([
      Prescription.countDocuments({ clinicId }),
      Prescription.countDocuments({ clinicId, status: 'active' }),
      Prescription.countDocuments({ clinicId, status: 'dispensed' }),
      Prescription.countDocuments({ clinicId, status: 'completed' }),
      Prescription.countDocuments({ clinicId, status: 'cancelled' }),
      Prescription.countDocuments({ clinicId, status: 'draft' }),
    ]);

    res.json({
      success: true,
      stats: { total, active, dispensed, completed, cancelled, draft },
    });
  } catch (error) {
    console.error('Get prescription stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Patient Prescriptions (Paginated) ──
export const getPatientPrescriptionsPaginated = async (req, res) => {
  try {
    const patientId = req.params.id;
    const clinicId = req.user?.clinicId;
    const { page = 1, limit = 10, status } = req.query;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const patient = await Patient.findOne({ _id: patientId, clinicId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const query = { patientId: patient._id, clinicId };
    if (status) query.status = status;

    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .populate('doctorId', 'name specialization')
      .populate('medicines.medicineId', 'name dosageForm strength')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      prescriptions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get patient prescriptions paginated error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Prescription for Print ──
export const getPrescriptionForPrint = async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(400).json({ success: false, message: 'Clinic ID is required' });
    }

    const prescription = await Prescription.findOne({
      _id: prescriptionId,
      clinicId,
    })
      .populate('patientId', 'name patientId phone dob gender bloodGroup address')
      .populate('doctorId', 'name specialization department phone')
      .populate('medicines.medicineId', 'name dosageForm strength manufacturer');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const printData = {
      prescriptionId: prescription._id,
      date: prescription.createdAt,
      patient: {
        name: prescription.patientId?.name || prescription.patientName,
        patientId: prescription.patientId?.patientId,
        phone: prescription.patientId?.phone || prescription.patientPhone,
        dob: prescription.patientId?.dob,
        gender: prescription.patientId?.gender,
        bloodGroup: prescription.patientId?.bloodGroup,
      },
      doctor: {
        name: prescription.doctorId?.name || prescription.doctorName,
        specialization: prescription.doctorId?.specialization || prescription.doctorSpecialization,
        phone: prescription.doctorId?.phone,
      },
      diagnosis: prescription.diagnosis,
      chiefComplaint: prescription.chiefComplaint,
      medicines: prescription.medicines,
      tests: prescription.tests,
      notes: prescription.notes,
      followUpDate: prescription.followUpDate,
      followUpInstructions: prescription.followUpInstructions,
      validUntil: prescription.validUntil,
    };

    res.json({
      success: true,
      printData,
    });
  } catch (error) {
    console.error('Get prescription for print error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};