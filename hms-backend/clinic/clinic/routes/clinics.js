import express from 'express';
import Clinic from '../models/Clinic.js';
import auth from '../middleware/auth.js';
import Sale from '../../ims/src/models/Sale.js';
import Product from '../../ims/src/models/Product.js';

const router = express.Router();

// ── GET /api/clinics/me ──────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    // ── FIXED: pharmacists can read their assigned clinic ──
    if (!['admin', 'pharmacist'].includes(req.user.role))
      return res.status(403).json({ message: 'Admin only.' });

    const clinic = await Clinic.findById(req.user.clinicId).select('-password');
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/clinics/me ──────────────────────────────────────────
router.put('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only.' });

    const {
      name, owner, phone, city,
      email, address, district, state,
      pincode, subDistrict,
    } = req.body;

    const clinic = await Clinic.findByIdAndUpdate(
      req.user.clinicId,
      { name, owner, phone, city, email, address, district, state, pincode, subDistrict },
      { new: true }
    ).select('-password');

    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/clinics/activate-plan ─────────────────────────────
router.post('/activate-plan', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ message: 'Admin only.' });

    const { plan } = req.body;

    if (!['lite', 'plus', 'pro'].includes(plan))
      return res.status(400).json({ message: 'Invalid plan.' });

    const now = new Date();
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);

    const clinic = await Clinic.findByIdAndUpdate(
      req.user.clinicId,
      {
        plan,
        planActivatedAt: now.toISOString().split('T')[0],
        planExpiresAt:   exp.toISOString().split('T')[0],
      },
      { new: true }
    ).select('-password');

    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/revenue",  auth,  async (req, res) => {
  
  const { from, to } = req.query;
  const clinicId = req.user.clinicId;
  
  // Validate date range
  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }
  
  const fromDate = new Date(from);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);
  
  // Get all finalized sales in date range
  const sales = await Sale.find({
    clinicId,
    status: "finalized",
    createdAt: { $gte: fromDate, $lte: toDate }
  }).populate("customer", "name");
  
  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + (sale.finalAmount || 0), 0);
  const totalOrders = sales.length;
  
  // Calculate profit (you may need to adjust this based on your schema)
  let totalProfit = 0;
  for (const sale of sales) {
    let cost = 0;
    for (const item of sale.items) {
      const product = await Product.findById(item.product).select("costPrice").lean();
      cost += (product?.costPrice || 0) * (item.quantity || 0);
    }
    totalProfit += (sale.finalAmount || 0) - cost;
  }
  
  // Get pharmacist breakdown (if you have pharmacist data in sales)
  const pharmacistMap = new Map();
  for (const sale of sales) {
    if (sale.pharmacistId) {
      const existing = pharmacistMap.get(String(sale.pharmacistId)) || {
        sales: 0,
        orders: 0,
        profit: 0
      };
      existing.sales += sale.finalAmount || 0;
      existing.orders += 1;
      pharmacistMap.set(String(sale.pharmacistId), existing);
    }
  }
  
  const pharmacists = Array.from(pharmacistMap.entries()).map(([id, data]) => ({
    _id: id,
    name: "Pharmacist", // You might want to fetch actual names from User model
    sales: data.sales,
    orders: data.orders,
    profit: data.profit
  }));
  
  res.json({
    ok:true,
    totalSales,
    totalProfit,
    totalOrders,
    revenue: totalSales,
    count: totalOrders,
    pharmacists
  });
});

export default router;