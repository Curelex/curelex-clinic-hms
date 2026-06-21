// hms-backend/models/Inventory.js
import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },

  itemCode: { type: String },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Other'],
    required: true
  },
  
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    default: null,
  },
  
  description: String,
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'Units' },
  unitPrice: { type: Number, required: true, default: 0 },
  totalValue: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },

  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },

  supplier: {
    name: String,
    contact: String,
    email: String
  },

  expiryDate: Date,
  location: String,
  lastRestockedAt: Date,

  equipmentDetails: {
    serialNumber: String,
    modelNumber: String,
    manufacturer: String,
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
    assignedTo: String,
    maintenanceLogs: [{
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ['Routine', 'Repair', 'Calibration', 'Emergency'], default: 'Routine' },
      performedBy: String,
      cost: { type: Number, default: 0 },
      notes: String,
      nextDueDate: Date
    }]
  },

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

// ── Auto-generate itemCode ──
InventorySchema.pre('save', async function (next) {
  if (!this.itemCode) {
    const prefix = this.category === 'Equipment' ? 'EQP' :
                   this.category === 'Medicine' ? 'MED' : 'INV';
    const count = await mongoose.model('Inventory').countDocuments({ clinicId: this.clinicId });
    this.itemCode = prefix + String(count + 1).padStart(5, '0');
  }
  
  this.totalValue = this.quantity * this.unitPrice;

  // ── ✅ Fix: Call sync without saving the inventory again ──
  if (this.category === 'Medicine') {
    // Use setImmediate to avoid parallel save issues
    setImmediate(async () => {
      try {
        await this.syncToMedicine();
      } catch (err) {
        console.error('Auto-sync to Medicine failed:', err);
      }
    });
  }

  next();
});

// ── ✅ FIXED: Auto-sync to Medicine without parallel save ──
InventorySchema.methods.syncToMedicine = async function() {
  try {
    const Medicine = mongoose.model('Medicine');
    
    // Check if medicine already exists
    let medicine = await Medicine.findOne({ 
      inventoryId: this._id,
      clinicId: this.clinicId 
    });

    if (medicine) {
      // Update existing medicine
      medicine.name = this.name;
      medicine.unitPrice = this.unitPrice;
      medicine.stockQuantity = this.quantity || 0;
      medicine.reorderLevel = this.reorderLevel || 10;
      medicine.isActive = this.status === 'Active';
      await medicine.save();
      
      // Update inventory medicineId if not set
      if (!this.medicineId) {
        this.medicineId = medicine._id;
        // ⚠️ Don't save here - we're already in a save operation
        // Use updateOne to avoid parallel save
        await this.constructor.updateOne(
          { _id: this._id },
          { $set: { medicineId: medicine._id } }
        );
      }
    } else {
      // Create new medicine
      medicine = await Medicine.create({
        name: this.name,
        dosageForm: 'Tablet',
        composition: '',
        manufacturer: '',
        clinicId: this.clinicId,
        doctorId: null,
        inventoryId: this._id,
        stockQuantity: this.quantity || 0,
        unitPrice: this.unitPrice || 0,
        reorderLevel: this.reorderLevel || 10,
        isActive: this.status === 'Active',
      });
      
      // ✅ Update inventory with medicineId using updateOne
      await this.constructor.updateOne(
        { _id: this._id },
        { $set: { medicineId: medicine._id } }
      );
    }
  } catch (err) {
    console.error('Auto-sync to Medicine failed:', err);
  }
};

// ── ✅ For quantity changes after save ──
InventorySchema.methods.syncStockToMedicine = async function() {
  if (!this.medicineId) return;
  
  try {
    const Medicine = mongoose.model('Medicine');
    await Medicine.findByIdAndUpdate(this.medicineId, {
      stockQuantity: this.quantity || 0,
      unitPrice: this.unitPrice || 0,
      reorderLevel: this.reorderLevel || 10,
    });
  } catch (err) {
    console.error('Stock sync failed:', err);
  }
};

// ── Virtuals ──
InventorySchema.virtual('stockStatus').get(function () {
  if (this.quantity <= 0) return 'Out of Stock';
  if (this.quantity <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

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

// ── Indexes ──
InventorySchema.index({ itemCode: 1, clinicId: 1 }, { unique: true, sparse: true });
InventorySchema.index({ clinicId: 1, category: 1 });
InventorySchema.index({ medicineId: 1 });

export default mongoose.model('Inventory', InventorySchema);