// hms-backend/models/Clinic.js
import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  type: { type: String, enum: ['clinic', 'hospital'], default: 'clinic' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  
  // ── Opening Hours ──
  openingHours: {
    monday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
    tuesday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
    wednesday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
    thursday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
    friday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
    saturday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
    sunday: { 
      open: { type: String }, 
      close: { type: String }, 
      isOpen: { type: Boolean } 
    },
  },
  // ── Plan fields ──
  plan: { type: String, enum: ['free', 'lite', 'plus', 'pro', 'standard', 'enterprise'], default: 'free' },
  planActivatedAt: { type: String },
  planExpiresAt: { type: String },
  planStatus: { type: String, enum: ['free', 'active', 'grace_period', 'expired'], default: 'free' },
  gracePeriodEndsAt: { type: String },
  isDataLocked: { type: Boolean, default: false },
  
}, { timestamps: true });

// ── Helper: Check if clinic is open at a given time ──
clinicSchema.methods.isOpenAt = function(date) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = dayNames[date.getDay()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  const daySchedule = this.openingHours?.[day];
  if (!daySchedule || !daySchedule.isOpen) return false;
  
  return timeStr >= daySchedule.open && timeStr <= daySchedule.close;
};

// ── Helper: Get today's opening hours ──
clinicSchema.methods.getTodayHours = function() {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = dayNames[new Date().getDay()];
  return this.openingHours?.[day] || null;
};

export default mongoose.model('Clinic', clinicSchema);