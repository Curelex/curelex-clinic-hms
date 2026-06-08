// hms-backend/models/Inventory.js - UPDATED with equipment tracking
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  itemCode: { type: String, unique: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Other'], 
    required: true 
  },
  description: String,
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'units' },
  unitPrice: { type: Number, required: true },
  totalValue: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  
  // ── UPDATED: Vendor reference (instead of embedded supplier) ──
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  
  // Keep old supplier for backward compatibility
  supplier: { 
    name: String, 
    contact: String, 
    email: String 
  },
  
  expiryDate: Date,
  location: String,
  lastRestockedAt: Date,
  
  // ── NEW: Equipment-specific fields (only for Equipment category) ──
  equipmentDetails: {
    serialNumber: { type: String, trim: true },
    modelNumber: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    purchaseDate: Date,
    warrantyExpiry: Date,
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    maintenanceIntervalDays: { type: Number, default: 90 },
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Under Repair', 'Decommissioned'],
      default: 'Good'
    },
    assignedTo: { type: String, trim: true },  // Ward/Department
    maintenanceLogs: [{
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ['Routine', 'Repair', 'Calibration', 'Emergency'], default: 'Routine' },
      performedBy: String,
      cost: { type: Number, default: 0 },
      notes: String,
      nextDueDate: Date
    }]
  },
  
  // Stock transactions history
  transactions: [{
    type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] },
    quantity: Number,
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    reason: String,
    referenceNumber: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: String,
    notes: String,
    date: { type: Date, default: Date.now }
  }],
  
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Discontinued'],
    default: 'Active'
  }
}, { timestamps: true });

// Auto-generate itemCode
InventorySchema.pre('save', async function (next) {
  if (!this.itemCode) {
    const count = await mongoose.model('Inventory').countDocuments();
    const prefix = this.category === 'Equipment' ? 'EQP' : 
                   this.category === 'Medicine' ? 'MED' : 'INV';
    this.itemCode = prefix + String(count + 1).padStart(5, '0');
  }
  this.totalValue = this.quantity * this.unitPrice;
  next();
});

// Virtual for stock status
InventorySchema.virtual('stockStatus').get(function () {
  if (this.quantity <= 0) return 'Out of Stock';
  if (this.quantity <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

// Virtual for maintenance status (equipment only)
InventorySchema.virtual('maintenanceStatus').get(function () {
  if (this.category !== 'Equipment' || !this.equipmentDetails?.nextMaintenanceDate) return null;
  const today = new Date();
  const next = new Date(this.equipmentDetails.nextMaintenanceDate);
  const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'Overdue';
  if (daysUntil <= 7) return 'Due Soon';
  return 'OK';
});

InventorySchema.set('toJSON', { virtuals: true });
InventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', InventorySchema);