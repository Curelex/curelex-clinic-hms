// hms-backend/routes/vendors.js

const router = require('express').Router();
const Vendor = require('../models/Vendor');
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ── GET vendor stats summary (SPECIFIC route - MUST come first) ──
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ status: 'Active' });
    const inactiveVendors = await Vendor.countDocuments({ status: 'Inactive' });
    
    const byCategory = await Vendor.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const categoryMap = {};
    byCategory.forEach(cat => {
      categoryMap[cat._id] = cat.count;
    });
    
    res.json({
      totalVendors,
      activeVendors,
      inactiveVendors,
      byCategory: categoryMap
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET active vendors for dropdown ──
router.get('/list/active', auth, async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: 'Active' })
      .select('name vendorId contactPerson phone')
      .sort({ name: 1 });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET all vendors ──
router.get('/', auth, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;
    
    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .populate('createdBy', 'name')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    res.json({ vendors, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single vendor with their items ──
router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('createdBy', 'name');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    
    const suppliedItems = await Inventory.find({ vendor: vendor._id })
      .select('name itemCode quantity unitPrice category');
    
    res.json({ vendor, suppliedItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE vendor ──
router.post('/', auth, async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const vendor = new Vendor(vendorData);
    await vendor.save();
    
    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE vendor ──
router.put('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE vendor (only if no items linked) ──
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const linkedItems = await Inventory.countDocuments({ vendor: req.params.id });
    if (linkedItems > 0) {
      return res.status(400).json({ 
        message: `Cannot delete vendor. ${linkedItems} inventory item(s) are linked.` 
      });
    }
    
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;