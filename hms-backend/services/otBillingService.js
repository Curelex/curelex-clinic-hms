// hms-backend/services/otBillingService.js - Complete Fixed Version

import Billing from '../models/Billing.js';
import OTBooking from '../models/ot/OTBooking.js';
import SurgeryRequest from '../models/ot/SurgeryRequest.js';
import mongoose from 'mongoose';

// ── OT Charge Configuration ──
const DEFAULT_OT_CHARGES = {
  baseRatePerHour: 5000,
  surgeonFeePercentage: 30,
  anesthetistFeePercentage: 15,
  emergencySurcharge: 2000,
  equipmentCharges: {
    'Ventilator': 1500,
    'C-Arm': 2000,
    'Laparoscope': 2500,
    'Microscope': 3000,
  },
  recoveryRoomRatePerHour: 1000,
};

export const otBillingService = {
  async calculateOTCharges(bookingId) {
    const booking = await OTBooking.findById(bookingId)
      .populate('requestId')
      .populate('otRoomId');
    
    if (!booking) throw new Error('Booking not found');

    const request = booking.requestId;
    const room = booking.otRoomId;

    const start = new Date(booking.scheduledStart);
    const end = new Date(booking.scheduledEnd);
    const durationHours = Math.max(0.5, (end - start) / (1000 * 60 * 60));

    let equipmentCharge = 0;
    if (room?.equipmentTags) {
      for (const tag of room.equipmentTags) {
        const charge = DEFAULT_OT_CHARGES.equipmentCharges[tag] || 0;
        equipmentCharge += charge;
      }
    }

    const baseCharge = durationHours * DEFAULT_OT_CHARGES.baseRatePerHour;
    const surgeonFee = baseCharge * (DEFAULT_OT_CHARGES.surgeonFeePercentage / 100);
    const anesthetistFee = baseCharge * (DEFAULT_OT_CHARGES.anesthetistFeePercentage / 100);
    const emergencySurcharge = request?.priority === 'emergency' ? DEFAULT_OT_CHARGES.emergencySurcharge : 0;
    const recoveryCharge = 2 * DEFAULT_OT_CHARGES.recoveryRoomRatePerHour;

    const total = baseCharge + surgeonFee + anesthetistFee + equipmentCharge + emergencySurcharge + recoveryCharge;

    return {
      durationHours,
      baseCharge,
      surgeonFee,
      anesthetistFee,
      equipmentCharge,
      emergencySurcharge,
      recoveryCharge,
      total,
      breakdown: {
        baseCharge,
        surgeonFee,
        anesthetistFee,
        equipmentCharge,
        emergencySurcharge,
        recoveryCharge,
      }
    };
  },

  async addOTToBill(bookingId) {
    try {
      const booking = await OTBooking.findById(bookingId)
        .populate({
          path: 'requestId',
          populate: { path: 'patientId' }
        });
      
      if (!booking) throw new Error('Booking not found');

      const request = booking.requestId;
      
      // ── FIX: Get patient ID correctly ──
      let patientId = request?.patientId?._id || request?.patientId;
      
      if (!patientId) {
        // Try to get patient from booking directly if request doesn't have it
        const requestData = await SurgeryRequest.findById(booking.requestId);
        if (requestData) {
          patientId = requestData.patientId;
        }
      }
      
      if (!patientId) {
        throw new Error('Patient not found for this booking');
      }

      // Convert to ObjectId if string
      if (typeof patientId === 'string') {
        patientId = new mongoose.Types.ObjectId(patientId);
      }

      console.log(`📝 Adding OT charges to bill for patient: ${patientId}`);

      // Calculate charges
      const charges = await this.calculateOTCharges(bookingId);

      // ── FIX: Find or create bill with proper patient reference ──
      let bill = await Billing.findOne({ 
        patient: patientId, 
        paymentStatus: { $in: ['Pending', 'Partial', 'Unpaid'] } 
      });

      if (!bill) {
        // Check if there's any bill for this patient
        bill = await Billing.findOne({ patient: patientId });
        
        if (!bill) {
          // Create new bill
          bill = new Billing({
            patient: patientId,
            clinicId: booking.clinicId || 'default',
            generatedBy: booking.createdBy || null,
            paymentStatus: 'Pending',
            totalAmount: 0,
            items: [],
          });
          console.log(`📄 Created new bill for patient: ${patientId}`);
        } else {
          // Reset to pending if bill was paid
          bill.paymentStatus = 'Pending';
        }
      }

      // ── FIX: Remove existing OT items for this booking ──
      const sourceRef = bookingId.toString();
      bill.items = bill.items.filter(item => 
        !(item.category === 'OT' && item.sourceRef === sourceRef)
      );

      // ── Add OT items ──
      const otItems = [
        { description: `OT Base Charge (${charges.durationHours.toFixed(1)} hrs)`, amount: charges.breakdown.baseCharge },
        { description: `Surgeon Fee`, amount: charges.breakdown.surgeonFee },
        { description: `Anesthetist Fee`, amount: charges.breakdown.anesthetistFee },
      ];

      if (charges.breakdown.equipmentCharge > 0) {
        otItems.push({ description: `Equipment Charges`, amount: charges.breakdown.equipmentCharge });
      }
      if (charges.breakdown.emergencySurcharge > 0) {
        otItems.push({ description: `Emergency Surcharge`, amount: charges.breakdown.emergencySurcharge });
      }
      if (charges.breakdown.recoveryCharge > 0) {
        otItems.push({ description: `Recovery Room`, amount: charges.breakdown.recoveryCharge });
      }

      otItems.forEach(item => {
        bill.items.push({
          description: item.description,
          category: 'OT',
          quantity: 1,
          unitPrice: item.amount,
          total: item.amount,
          addedByName: 'OT System',
          sourceRef: sourceRef,
        });
      });

      // ── Recalculate totals ──
      bill.subtotal = bill.items.reduce((sum, i) => sum + (i.total || 0), 0);
      bill.totalAmount = bill.subtotal - (bill.discount || 0) + (bill.subtotal * (bill.tax || 0)) / 100;

      await bill.save();
      console.log(`✅ OT charges added to bill: ${bill.billId}, Total: ₹${charges.total}`);

      return { bill, charges };
    } catch (err) {
      console.error('❌ addOTToBill error:', err);
      throw err;
    }
  },

  async removeOTFromBill(bookingId) {
    try {
      const sourceRef = bookingId.toString();
      const bill = await Billing.findOne({
        'items.sourceRef': sourceRef,
        'items.category': 'OT'
      });

      if (!bill) return null;

      bill.items = bill.items.filter(item => 
        !(item.category === 'OT' && item.sourceRef === sourceRef)
      );

      bill.subtotal = bill.items.reduce((sum, i) => sum + (i.total || 0), 0);
      bill.totalAmount = bill.subtotal - (bill.discount || 0) + (bill.subtotal * (bill.tax || 0)) / 100;

      await bill.save();
      return bill;
    } catch (err) {
      console.error('❌ removeOTFromBill error:', err);
      throw err;
    }
  },

  async getPatientOTCharges(patientId) {
    try {
      // ── FIX: Convert to ObjectId if needed ──
      let patientObjId = patientId;
      if (typeof patientId === 'string') {
        patientObjId = new mongoose.Types.ObjectId(patientId);
      }

      console.log(`🔍 Fetching OT charges for patient: ${patientObjId}`);

      // ── FIX: Use proper query with $elemMatch for nested array ──
      const bills = await Billing.find({ 
        patient: patientObjId
      }).populate('generatedBy', 'name');

      console.log(`📄 Found ${bills.length} bills for patient`);

      const otItems = [];
      let totalOTCharges = 0;

      bills.forEach(bill => {
        // Filter OT items from this bill
        const otItemsInBill = bill.items.filter(item => item.category === 'OT');
        
        if (otItemsInBill.length > 0) {
          console.log(`  Bill ${bill.billId}: ${otItemsInBill.length} OT items`);
          
          otItemsInBill.forEach(item => {
            otItems.push({
              ...item.toObject(),
              billId: bill.billId,
              billDate: bill.createdAt,
              paymentStatus: bill.paymentStatus,
            });
            totalOTCharges += item.total || 0;
          });
        }
      });

      console.log(`✅ Found ${otItems.length} OT items, Total: ₹${totalOTCharges}`);

      return {
        otItems,
        totalOTCharges,
        bills: bills.length,
      };
    } catch (err) {
      console.error('❌ getPatientOTCharges error:', err);
      throw err;
    }
  }
};

export default otBillingService;