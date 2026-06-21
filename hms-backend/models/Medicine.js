// hms-backend/models/Medicine.js
import mongoose from 'mongoose';

const MedicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  composition: { type: String },
  dosageForm: { 
    type: String, 
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Suspension', 'Ointment'],
    default: 'Tablet' 
  },
  strength: { type: String },
  manufacturer: { type: String },
  
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
  },
  
  // ── Link to Inventory ──
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    default: null,
  },
  
  // ── Stock fields (auto-synced from inventory) ──
  stockQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  
  isActive: { type: Boolean, default: true },
  
}, { timestamps: true });

// Indexes
MedicineSchema.index({ doctorId: 1, name: 1 });
MedicineSchema.index({ clinicId: 1, doctorId: 1 });
MedicineSchema.index({ clinicId: 1, name: 1 });
MedicineSchema.index({ inventoryId: 1 });

// ── Method to sync stock from inventory ──
MedicineSchema.methods.syncStockFromInventory = async function() {
  if (!this.inventoryId) return;
  
  const Inventory = mongoose.model('Inventory');
  const inventoryItem = await Inventory.findById(this.inventoryId);
  
  if (inventoryItem) {
    this.stockQuantity = inventoryItem.quantity || 0;
    this.unitPrice = inventoryItem.unitPrice || 0;
    this.reorderLevel = inventoryItem.reorderLevel || 10;
    await this.save();
  }
};

export default mongoose.model('Medicine', MedicineSchema);