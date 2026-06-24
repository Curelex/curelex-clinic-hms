// hms-backend/routes/pharmacy.js
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
import express from 'express';

import Pharmacy from '../models/Pharmacy.js';
import Inventory from '../models/Inventory.js';
import Billing from '../models/Billing.js';
import BillingRequest from '../models/BillingRequest.js';
import Admission from '../models/Admission.js';
import { auth } from '../middleware/auth.js';
import { getClinicFilter } from '../middleware/clinicFilter.js';

const router = express.Router();

// ── GET /pharmacy/inventory/search?q=  ───────────────────────────────────────
// MUST be before /:id route to avoid conflict
router.get('/inventory/search', auth, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    
    const items = await Inventory.find({
      clinicId,
      name: { $regex: q, $options: 'i' },
      category: 'Medicine',
      quantity: { $gt: 0 },
      status: 'Active'
    })
      .select('name unitPrice quantity unit itemCode')
      .limit(15);
    
    res.json(items);
  } catch (err) {
    console.error('Inventory search error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET all prescriptions (Clinic Scoped) ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    const { status, patient, page = 1, limit = 20 } = req.query;
    
    const query = { clinicId };
    if (status) query.status = status;
    if (patient) query.patient = patient;

    const total = await Pharmacy.countDocuments(query);
    const prescriptions = await Pharmacy.find(query)
      .populate('patient', 'name patientId phone email')
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ 
      prescriptions, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / limit) 
    });
  } catch (err) {
    console.error('Get prescriptions error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET prescriptions by patient (Clinic Scoped) ─────────────────────────────
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { 
      clinicId,
      patient: req.params.patientId 
    };
    if (status) query.status = status;

    const total = await Pharmacy.countDocuments(query);
    const prescriptions = await Pharmacy.find(query)
      .populate('patient', 'name patientId phone email')
      .populate('dispensedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ 
      prescriptions, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / limit) 
    });
  } catch (err) {
    console.error('Get patient prescriptions error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET single prescription (Clinic Scoped) ───────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    
    const rx = await Pharmacy.findOne({ 
      _id: req.params.id, 
      clinicId 
    })
      .populate('patient', 'name patientId phone email dob gender bloodGroup')
      .populate('dispensedBy', 'name');
    
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    res.json(rx);
  } catch (err) {
    console.error('Get prescription error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST create prescription (Clinic Scoped) ──────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    
    const body = { ...req.body, clinicId };
    
    if (!body.patient) {
      return res.status(400).json({ message: 'Patient is required' });
    }

    // Check if patient exists in this clinic
    const Patient = (await import('../models/Patient.js')).default;
    const patientExists = await Patient.findOne({ 
      _id: body.patient, 
      clinicId 
    });
    
    if (!patientExists) {
      return res.status(404).json({ message: 'Patient not found in this clinic' });
    }

    // Check admission at creation time — save isIPD so it persists on the record
    const activeAdmission = await Admission.findOne({
      patient: body.patient,
      status: 'Admitted',
      clinicId,
    });
    body.isIPD = !!activeAdmission;

    // Calculate totals for each medicine
    if (body.medicines && Array.isArray(body.medicines)) {
      let totalAmount = 0;
      body.medicines = body.medicines.map(med => {
        const quantity = Number(med.quantity) || 1;
        const unitPrice = Number(med.unitPrice) || 0;
        const total = quantity * unitPrice;
        totalAmount += total;
        return {
          ...med,
          quantity,
          unitPrice,
          total
        };
      });
      body.totalAmount = totalAmount;
    }

    const rx = new Pharmacy(body);
    await rx.save();
    await rx.populate('patient', 'name patientId phone');
    
    res.status(201).json(rx);
  } catch (err) {
    console.error('Pharmacy create error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── PUT update prescription (Clinic Scoped) ───────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    
    const data = { ...req.body };
    
    // If dispensing, set dispensed details
    if (req.body.status === 'Dispensed') {
      data.dispensedBy = req.user.id;
      data.dispensedAt = new Date();
    }
    
    // Recalculate totals if medicines changed
    if (data.medicines && Array.isArray(data.medicines)) {
      let totalAmount = 0;
      data.medicines = data.medicines.map(med => {
        const quantity = Number(med.quantity) || 1;
        const unitPrice = Number(med.unitPrice) || 0;
        const total = quantity * unitPrice;
        totalAmount += total;
        return {
          ...med,
          quantity,
          unitPrice,
          total
        };
      });
      data.totalAmount = totalAmount;
    }
    
    const rx = await Pharmacy.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      data,
      { new: true, runValidators: true }
    ).populate('patient', 'name patientId phone');
    
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    res.json(rx);
  } catch (err) {
    console.error('Update prescription error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE prescription (Clinic Scoped) ──────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    
    const rx = await Pharmacy.findOne({ 
      _id: req.params.id, 
      clinicId 
    });
    
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    if (rx.status === 'Dispensed') {
      return res.status(400).json({ 
        message: 'Cannot delete a dispensed prescription' 
      });
    }
    
    await rx.deleteOne();
    res.json({ message: 'Prescription deleted successfully' });
  } catch (err) {
    console.error('Delete prescription error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /pharmacy/:id/dispense ───────────────────────────────────────────────
//
//  OPD flow:
//    1. Stock check → deduct inventory
//    2. Mark Dispensed
//    3. Create/update Billing doc, mark Paid immediately
//
//  IPD flow:
//    1. Stock check → deduct inventory
//    2. Mark Dispensed
//    3. Append medicines to admission.medicineLog
//    4. Create BillingRequest → billing dept approves → auto-added to patient bill
//
router.post('/:id/dispense', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';
    const { paymentMethod = 'Cash' } = req.body;

    const rx = await Pharmacy.findOne({ 
      _id: req.params.id, 
      clinicId 
    }).populate('patient', 'name patientId phone');
    
    if (!rx) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    
    if (rx.status === 'Dispensed') {
      return res.status(400).json({ message: 'Already dispensed' });
    }
    
    if (rx.status === 'Cancelled') {
      return res.status(400).json({ message: 'Prescription is cancelled' });
    }

    // ── STEP 1: Stock check — all-or-nothing before any changes ─────────────
    const stockErrors = [];
    const inventoryItems = [];
    
    for (const med of rx.medicines) {
      const escaped = med.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const item = await Inventory.findOne({
        clinicId,
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
        category: 'Medicine',
        status: 'Active'
      });
      
      if (!item) {
        stockErrors.push(`"${med.name}" not found in inventory`);
      } else if (item.quantity < med.quantity) {
        stockErrors.push(
          `"${med.name}" insufficient stock (have ${item.quantity}, need ${med.quantity})`
        );
      } else {
        inventoryItems.push({ item, med });
      }
    }
    
    if (stockErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Stock check failed.', 
        stockErrors 
      });
    }

    // ── STEP 2: Deduct stock ─────────────────────────────────────────────────
    for (const { item, med } of inventoryItems) {
      const oldQuantity = item.quantity;
      item.quantity -= med.quantity;
      item.totalValue = item.quantity * item.unitPrice;
      
      item.transactions.push({
        type: 'OUT',
        quantity: med.quantity,
        unitPrice: med.unitPrice || 0,
        totalPrice: med.total || (med.quantity * (med.unitPrice || 0)),
        reason: `Dispensed — ${rx.prescriptionId} (${rx.patient?.name || 'Patient'})`,
        referenceNumber: rx.prescriptionId,
        performedBy: req.user.id,
        performedByName: req.user.name || 'Pharmacy',
        date: new Date(),
        notes: `Dispensed from prescription ${rx.prescriptionId}`
      });
      
      await item.save();
      
      // Auto-sync to Medicine if linked
      if (item.medicineId) {
        await item.syncStockToMedicine();
      }
    }

    // ── STEP 3: Mark dispensed ───────────────────────────────────────────────
    rx.status = 'Dispensed';
    rx.dispensedBy = req.user.id;
    rx.dispensedAt = new Date();
    await rx.save();

    // ── STEP 4: Determine OPD vs IPD ────────────────────────────────────────
    // Live admission check first; fall back to saved isIPD on record
    const activeAdmission = await Admission.findOne({
      patient: rx.patient._id,
      status: 'Admitted',
      clinicId,
    });
    const isIPD = !!activeAdmission || rx.isIPD;

    // ════════════════════════════════════════════════════════════════════════
    //  IPD FLOW
    // ════════════════════════════════════════════════════════════════════════
    if (isIPD && activeAdmission) {
      // 4a. Append to admission medicine log
      for (const med of rx.medicines) {
        activeAdmission.medicineLog.push({
          medicineName: med.name,
          dosage: med.dosage || '',
          quantity: med.quantity,
          unitPrice: med.unitPrice || 0,
          total: med.total || 0,
          givenBy: req.user.id,
          givenByName: req.user.name || 'Pharmacy',
          notes: med.instructions || '',
        });
      }
      await activeAdmission.save();

      // 4b. Create BillingRequest (idempotent)
      const alreadyExists = await BillingRequest.findOne({ 
        pharmacy: rx._id,
        clinicId 
      });
      
      if (!alreadyExists) {
        const breq = await BillingRequest.create({
          type: 'Pharmacy',
          clinicId,
          pharmacy: rx._id,
          pharmacyId: rx.prescriptionId,
          patient: rx.patient._id,
          patientId: rx.patient.patientId,
          patientName: rx.patient.name,
          tests: rx.medicines.map(m => ({
            testName: `${m.name}${m.dosage ? ' ' + m.dosage : ''}`,
            price: m.total || ((m.quantity || 0) * (m.unitPrice || 0)),
          })),
          totalAmount: rx.totalAmount,
          requestedBy: req.user.id,
          requestedByName: req.user.name || 'Pharmacy',
          status: 'Pending',
        });

        return res.json({
          rx,
          flow: 'IPD',
          billingRequest: breq,
          message: `Medicines dispensed & logged to admission. Billing request ${breq.requestId} sent to billing dept for approval.`,
        });
      }

      return res.json({
        rx,
        flow: 'IPD',
        message: 'Dispensed & logged to admission. Billing request already exists.',
      });

    // ════════════════════════════════════════════════════════════════════════
    //  OPD FLOW
    // ════════════════════════════════════════════════════════════════════════
    } else {
      const billItems = rx.medicines.map(m => ({
        description: `${m.name}${m.dosage ? ' (' + m.dosage + ')' : ''}`,
        category: 'Medicine',
        addedByName: req.user.name || 'Pharmacy',
        quantity: m.quantity,
        unitPrice: m.unitPrice || 0,
        total: m.total || 0,
        sourceRef: rx.prescriptionId,
      }));

      // Find or create bill
      let bill = await Billing.findOne({ 
        patient: rx.patient._id,
        clinicId
      }).sort({ createdAt: -1 });

      if (bill) {
        const alreadyAdded = bill.items.some(i => i.sourceRef === rx.prescriptionId);
        if (!alreadyAdded) {
          bill.items.push(...billItems);
          const itemsTotal = bill.items.reduce((s, i) => s + (i.total || 0), 0);
          bill.subtotal = itemsTotal + (bill.roomRent || 0);
          bill.totalAmount = bill.subtotal - (bill.discount || 0) + (bill.subtotal * (bill.tax || 0) / 100);
          bill.paidAmount = bill.totalAmount;
          bill.paymentStatus = 'Paid';
          bill.paymentMethod = paymentMethod;
          await bill.save();
        }
      } else {
        bill = new Billing({
          clinicId,
          patient: rx.patient._id,
          items: billItems,
          subtotal: rx.totalAmount,
          totalAmount: rx.totalAmount,
          paidAmount: rx.totalAmount,
          paymentMethod,
          paymentStatus: 'Paid',
          generatedBy: req.user.id,
        });
        await bill.save();
      }

      await bill.populate('patient', 'name patientId phone');

      return res.json({
        rx,
        flow: 'OPD',
        bill,
        message: `Medicines dispensed. Bill ${bill.billId} of ₹${rx.totalAmount} generated & paid (${paymentMethod}).`,
      });
    }

  } catch (err) {
    console.error('Dispense error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET pharmacy stats (Clinic Scoped) ────────────────────────────────────────
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const clinicFilter = getClinicFilter(req.user);
    const clinicId = clinicFilter.clinicId || req.user?.clinicId || 'default';

    const [
      total,
      pending,
      dispensed,
      cancelled,
      totalRevenue
    ] = await Promise.all([
      Pharmacy.countDocuments({ clinicId }),
      Pharmacy.countDocuments({ clinicId, status: 'Pending' }),
      Pharmacy.countDocuments({ clinicId, status: 'Dispensed' }),
      Pharmacy.countDocuments({ clinicId, status: 'Cancelled' }),
      Pharmacy.aggregate([
        { $match: { clinicId, status: 'Dispensed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Today's dispensed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDispensed = await Pharmacy.countDocuments({
      clinicId,
      status: 'Dispensed',
      dispensedAt: { $gte: today }
    });

    res.json({
      total,
      pending,
      dispensed,
      cancelled,
      todayDispensed,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (err) {
    console.error('Pharmacy stats error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;