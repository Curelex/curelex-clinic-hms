// hms-backend/controllers/medicineController.js
import Medicine from '../models/Medicine.js';
import Inventory from '../models/Inventory.js';

// ── Admin adds global medicine ──
export const addMedicine = async (req, res) => {
  try {
    const { name, composition, dosageForm, strength, manufacturer, unitPrice } = req.body;
    const clinicId = req.user.clinicId;

    const existing = await Medicine.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      clinicId,
      doctorId: null,
    });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Medicine already exists in the global list' 
      });
    }

    const medicine = await Medicine.create({
      name,
      composition,
      dosageForm: dosageForm || 'Tablet',
      strength,
      manufacturer,
      unitPrice: unitPrice || 0,
      doctorId: null,
      clinicId,
      isActive: true,
    });

    // ── Create Inventory entry ──
    const inventory = await Inventory.create({
      clinicId,
      name,
      category: 'Medicine',
      medicineId: medicine._id,
      quantity: 0,
      unitPrice: unitPrice || 0,
      reorderLevel: 10,
      status: 'Active',
    });

    medicine.inventoryId = inventory._id;
    await medicine.save();

    res.status(201).json({
      success: true,
      message: 'Medicine added successfully with inventory entry',
      medicine,
      inventory,
    });
  } catch (error) {
    console.error('Add medicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get all global medicines ──
export const getMedicines = async (req, res) => {
  try {
    const clinicId = req.user.clinicId;
    const { search, page = 1, limit = 50 } = req.query;

    const query = { clinicId, doctorId: null, isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { composition: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .populate('inventoryId', 'quantity unitPrice reorderLevel')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ 
      success: true, 
      medicines,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Doctor adds their own medicine ──
export const addDoctorMedicine = async (req, res) => {
  try {
    const { name, composition, dosageForm, strength, unitPrice } = req.body;
    const clinicId = req.user.clinicId;
    const doctorId = req.user.id;

    const existing = await Medicine.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      clinicId,
      doctorId,
    });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have this medicine in your list' 
      });
    }

    const medicine = await Medicine.create({
      name,
      composition,
      dosageForm: dosageForm || 'Tablet',
      strength,
      unitPrice: unitPrice || 0,
      doctorId,
      clinicId,
      isActive: true,
    });

    const inventory = await Inventory.create({
      clinicId,
      name,
      category: 'Medicine',
      medicineId: medicine._id,
      quantity: 0,
      unitPrice: unitPrice || 0,
      reorderLevel: 10,
      status: 'Active',
    });

    medicine.inventoryId = inventory._id;
    await medicine.save();

    res.status(201).json({
      success: true,
      message: 'Medicine added to your personal list with inventory entry',
      medicine,
      inventory,
    });
  } catch (error) {
    console.error('Add doctor medicine error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get medicines for a specific doctor (own + global) ──
export const getDoctorMedicines = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const clinicId = req.user?.clinicId || req.query.clinicId;
    const { search } = req.query;

    const query = {
      clinicId,
      isActive: true,
      $or: [
        { doctorId },
        { doctorId: null },
      ],
    };

    if (search) {
      query.$or.push(
        { name: { $regex: search, $options: 'i' } },
        { composition: { $regex: search, $options: 'i' } },
      );
    }

    const medicines = await Medicine.find(query)
      .populate('inventoryId', 'quantity unitPrice reorderLevel')
      .sort({ doctorId: -1, name: 1 });

    res.json({ success: true, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Search Medicines (for prescription writing) ──
export const searchMedicines = async (req, res) => {
  try {
    const { query } = req.query;
    const clinicId = req.user?.clinicId;
    const doctorId = req.user?.id;

    if (!query || query.length < 2) {
      return res.json({ success: true, medicines: [] });
    }

    const searchQuery = {
      clinicId,
      isActive: true,
      $or: [
        { doctorId: doctorId },
        { doctorId: null },
      ],
      name: { $regex: query, $options: 'i' },
    };

    const medicines = await Medicine.find(searchQuery)
      .populate('inventoryId', 'quantity unitPrice reorderLevel')
      .sort({ doctorId: -1, name: 1 })
      .limit(20);

    const result = medicines.map(med => ({
      ...med.toObject(),
      stockStatus: med.inventoryId?.quantity > 0 ? 'In Stock' : 'Out of Stock',
      availableQuantity: med.inventoryId?.quantity || 0,
    }));

    res.json({ 
      success: true, 
      medicines: result,
      count: result.length 
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete doctor's own medicine ──
export const deleteDoctorMedicine = async (req, res) => {
  try {
    const medicineId = req.params.id;
    const clinicId = req.user.clinicId;
    const doctorId = req.user.id;

    const medicine = await Medicine.findOne({
      _id: medicineId,
      clinicId,
      doctorId,
    });

    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        message: 'Medicine not found or not yours' 
      });
    }

    if (medicine.inventoryId) {
      await Inventory.findByIdAndDelete(medicine.inventoryId);
    }

    await medicine.deleteOne();
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Update medicine ──
export const updateMedicine = async (req, res) => {
  try {
    const medicineId = req.params.id;
    const clinicId = req.user.clinicId;
    const { name, composition, dosageForm, strength, manufacturer, unitPrice, isActive } = req.body;

    const medicine = await Medicine.findOne({ _id: medicineId, clinicId });
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    if (medicine.doctorId && String(medicine.doctorId) !== String(req.user.id)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own medicines' 
      });
    }

    if (name) medicine.name = name;
    if (composition) medicine.composition = composition;
    if (dosageForm) medicine.dosageForm = dosageForm;
    if (strength) medicine.strength = strength;
    if (manufacturer) medicine.manufacturer = manufacturer;
    if (unitPrice !== undefined) medicine.unitPrice = unitPrice;
    if (isActive !== undefined) medicine.isActive = isActive;

    await medicine.save();

    if (medicine.inventoryId) {
      await Inventory.findByIdAndUpdate(medicine.inventoryId, {
        name: medicine.name,
        unitPrice: medicine.unitPrice,
      });
    }

    res.json({
      success: true,
      message: 'Medicine updated successfully',
      medicine,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get medicine by ID ──
export const getMedicineById = async (req, res) => {
  try {
    const medicineId = req.params.id;
    const clinicId = req.user.clinicId;

    const medicine = await Medicine.findOne({ _id: medicineId, clinicId })
      .populate('inventoryId', 'quantity unitPrice reorderLevel');

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Sync ALL Medicines from Inventory ──
export const syncAllMedicinesFromInventory = async (req, res) => {
  try {
    const clinicId = req.user.clinicId;

    const inventoryItems = await Inventory.find({ 
      clinicId, 
      category: 'Medicine',
      status: 'Active'
    });

    let created = 0;
    let updated = 0;

    for (const inventory of inventoryItems) {
      let medicine = await Medicine.findOne({ 
        inventoryId: inventory._id,
        clinicId 
      });

      if (medicine) {
        medicine.name = inventory.name;
        medicine.unitPrice = inventory.unitPrice;
        medicine.stockQuantity = inventory.quantity;
        medicine.reorderLevel = inventory.reorderLevel;
        medicine.isActive = inventory.status === 'Active';
        await medicine.save();
        updated++;
      } else {
        medicine = await Medicine.create({
          name: inventory.name,
          dosageForm: 'Tablet',
          composition: '',
          manufacturer: '',
          clinicId,
          doctorId: null,
          inventoryId: inventory._id,
          stockQuantity: inventory.quantity || 0,
          unitPrice: inventory.unitPrice || 0,
          reorderLevel: inventory.reorderLevel || 10,
          isActive: inventory.status === 'Active',
        });
        inventory.medicineId = medicine._id;
        await inventory.save();
        created++;
      }
    }

    res.json({
      success: true,
      message: `Sync complete: ${created} created, ${updated} updated`,
      stats: { created, updated },
    });
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};