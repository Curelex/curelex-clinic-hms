// hms-backend/controllers/paymentController.js
import razorpayService from '../services/razorpayService.js';
import Telemedicine from '../models/Telemedicine.js';
import Billing from '../models/Billing.js';
import Clinic from '../models/Clinic.js';
import Subscription from '../models/Subscription.js';
import Transaction from '../models/Transaction.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Generate a unique receipt ID
 */
function generateReceipt(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

/**
 * Create Razorpay order for telemedicine payment
 */
export const createTelemedicineOrder = async (req, res) => {
  try {
    const { id } = req.params; // telemedicine ID
    const userId = req.user.id;

    const telemedicine = await Telemedicine.findById(id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name');

    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Telemedicine request not found' });
    }

    // Check if patient owns this request
    const patient = await Patient.findOne({ userId });
    if (!patient || String(patient._id) !== String(telemedicine.patientId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check if already paid
    if (telemedicine.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

    // Check if already has pending order
    const existingTransaction = await Transaction.findOne({
      telemedicineId: telemedicine._id,
      paymentStatus: 'pending',
    });
    if (existingTransaction) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment already in progress. Please complete or retry.',
        transactionId: existingTransaction.transactionId,
      });
    }

    const amount = telemedicine.consultationFee || 0;
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid consultation fee' });
    }

    const receipt = generateReceipt('TEL');

    const result = await razorpayService.createOrder({
      amount,
      receipt,
      notes: {
        type: 'telemedicine',
        telemedicineId: String(telemedicine._id),
        patientId: String(patient._id),
        doctorId: String(telemedicine.doctorId),
        patientEmail: patient.email || '',
        patientPhone: patient.phone || '',
      },
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    // Save transaction record
    const transaction = new Transaction({
      patientId: patient._id,
      doctorId: telemedicine.doctorId,
      clinicId: telemedicine.clinicId || null,
      telemedicineId: telemedicine._id,
      amount,
      doctorFee: amount, // Doctor gets 100% (no commission)
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      transactionId: result.orderId,
      paymentGateway: 'razorpay',
      paymentDetails: {
        razorpayOrderId: result.orderId,
        razorpayAmount: result.amount,
        razorpayCurrency: result.currency,
        receipt,
      },
    });

    await transaction.save();

    // Update telemedicine status
    telemedicine.paymentStatus = 'pending';
    telemedicine.transactionId = result.orderId;
    await telemedicine.save();

    res.json({
      success: true,
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      receipt: result.receipt,
      keyId: process.env.RAZORPAY_KEY_ID,
      transactionId: transaction._id,
      telemedicineId: telemedicine._id,
    });
  } catch (error) {
    console.error('Create telemedicine order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create Razorpay order for bill payment
 */
export const createBillOrder = async (req, res) => {
  try {
    const { billId } = req.params;
    const userId = req.user.id;

    const bill = await Billing.findById(billId).populate('patient', 'name email phone');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Check if patient owns this bill
    const patient = await Patient.findOne({ userId });
    if (!patient || String(patient._id) !== String(bill.patient._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const remainingAmount = bill.totalAmount - (bill.paidAmount || 0);
    if (remainingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Bill already paid' });
    }

    const receipt = generateReceipt('BILL');

    const result = await razorpayService.createOrder({
      amount: remainingAmount,
      receipt,
      notes: {
        type: 'billing',
        billId: String(bill._id),
        billNumber: bill.billId || bill._id.toString(),
        patientId: String(patient._id),
        patientEmail: patient.email || '',
        patientPhone: patient.phone || '',
      },
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    // Save transaction reference
    const transaction = new Transaction({
      patientId: patient._id,
      doctorId: null,
      clinicId: bill.clinicId || null,
      telemedicineId: null,
      amount: remainingAmount,
      doctorFee: 0,
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      transactionId: result.orderId,
      paymentGateway: 'razorpay',
      paymentDetails: {
        razorpayOrderId: result.orderId,
        razorpayAmount: result.amount,
        razorpayCurrency: result.currency,
        receipt,
        billId: bill._id,
      },
      notes: `Payment for bill ${bill.billId || bill._id}`,
    });

    await transaction.save();

    res.json({
      success: true,
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      receipt: result.receipt,
      keyId: process.env.RAZORPAY_KEY_ID,
      transactionId: transaction._id,
      billId: bill._id,
      remainingAmount,
    });
  } catch (error) {
    console.error('Create bill order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create Razorpay order for plan subscription
 */
export const createPlanOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user || !user.clinicId) {
      return res.status(400).json({ success: false, message: 'No clinic associated' });
    }

    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    // Get plan price
    const planPrices = {
      lite: 999,
      plus: 1499,
      pro: 1999,
      standard: 4999,
      enterprise: 6999,
    };

    const amount = planPrices[plan];
    if (!amount) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const receipt = generateReceipt('PLAN');

    const result = await razorpayService.createOrder({
      amount,
      receipt,
      notes: {
        type: 'subscription',
        clinicId: String(clinic._id),
        plan,
        clinicName: clinic.name,
        userEmail: user.email,
        userId: String(user._id),
      },
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      orderId: result.orderId,
      amount: result.amount,
      currency: result.currency,
      receipt: result.receipt,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
      clinicId: clinic._id,
    });
  } catch (error) {
    console.error('Create plan order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify payment and complete transaction
 */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, type } = req.body;

    // Verify signature
    const isValid = razorpayService.verifyPayment({ orderId, paymentId, signature });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Find transaction
    const transaction = await Transaction.findOne({ transactionId: orderId });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Already verified', transaction });
    }

    // Get payment details from Razorpay
    const paymentResult = await razorpayService.getPayment(paymentId);
    if (!paymentResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch payment details' });
    }

    const payment = paymentResult.payment;

    // Update transaction
    transaction.paymentStatus = 'paid';
    transaction.paidAt = new Date();
    transaction.paymentDetails = {
      ...transaction.paymentDetails,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      paymentMethod: payment.method,
      cardDetails: payment.card ? {
        last4: payment.card.last4,
        network: payment.card.network,
        bank: payment.card.bank,
      } : null,
    };

    await transaction.save();

    // Handle different payment types
    const notes = transaction.paymentDetails?.notes || {};
    const paymentType = notes.type || type;

    let result = { success: true, transaction };

    switch (paymentType) {
      case 'telemedicine':
        result = await handleTelemedicinePayment(transaction, payment);
        break;
      case 'billing':
        result = await handleBillPayment(transaction, payment);
        break;
      case 'subscription':
        result = await handleSubscriptionPayment(transaction, payment);
        break;
      default:
        console.warn('Unknown payment type:', paymentType);
    }

    res.json(result);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Handle telemedicine payment completion
 */
async function handleTelemedicinePayment(transaction, payment) {
  const telemedicine = await Telemedicine.findById(transaction.telemedicineId);
  if (!telemedicine) {
    throw new Error('Telemedicine request not found');
  }

  // Update telemedicine
  telemedicine.paymentStatus = 'paid';
  telemedicine.status = 'payment_completed';
  telemedicine.paidAt = new Date();
  telemedicine.paymentMethod = 'razorpay';
  telemedicine.paymentDetails = {
    razorpayPaymentId: payment.id,
    razorpayAmount: payment.amount,
    razorpayCurrency: payment.currency,
    method: payment.method,
  };
  telemedicine.doctorPayoutStatus = 'pending';
  telemedicine.doctorPayoutAmount = telemedicine.consultationFee;

  // Generate meeting link if not already
  if (!telemedicine.meetingLink) {
    const meetingId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    telemedicine.meetingId = meetingId;
    telemedicine.meetingLink = `https://meet.jit.si/Curelex-${meetingId}`;
    telemedicine.status = 'scheduled';
  }

  await telemedicine.save();

  // Create notification for doctor
  const Notification = mongoose.model('Notification');
  await Notification.create({
    userId: telemedicine.doctorId,
    message: `✅ Payment received! You can now start consultation with ${telemedicine.patientName}.`,
    taskId: telemedicine._id,
    clinicId: telemedicine.clinicId,
    read: false,
  });

  return {
    success: true,
    telemedicine,
    transaction,
    meetingLink: telemedicine.meetingLink,
  };
}

/**
 * Handle bill payment completion
 */
async function handleBillPayment(transaction, payment) {
  const billId = transaction.paymentDetails?.billId;
  if (!billId) {
    throw new Error('Bill ID not found in transaction');
  }

  const bill = await Billing.findById(billId);
  if (!bill) {
    throw new Error('Bill not found');
  }

  const paidAmount = transaction.amount / 100; // Convert from paise
  bill.paidAmount = (bill.paidAmount || 0) + paidAmount;

  if (bill.paidAmount >= bill.totalAmount) {
    bill.paymentStatus = 'Paid';
  } else {
    bill.paymentStatus = 'Partial';
  }

  bill.paymentMethod = 'Card';
  await bill.save();

  return {
    success: true,
    bill,
    transaction,
    remainingAmount: bill.totalAmount - bill.paidAmount,
  };
}

/**
 * Handle subscription payment completion
 */
async function handleSubscriptionPayment(transaction, payment) {
  const clinicId = transaction.paymentDetails?.notes?.clinicId;
  const plan = transaction.paymentDetails?.notes?.plan;

  if (!clinicId || !plan) {
    throw new Error('Clinic ID or plan not found in transaction');
  }

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new Error('Clinic not found');
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Update clinic
  clinic.plan = plan;
  clinic.planActivatedAt = now.toISOString().split('T')[0];
  clinic.planExpiresAt = expiresAt.toISOString().split('T')[0];
  clinic.planStatus = 'active';
  clinic.gracePeriodEndsAt = null;
  clinic.isDataLocked = false;
  await clinic.save();

  // Update subscription
  let subscription = await Subscription.findOne({ clinicId });
  if (!subscription) {
    subscription = new Subscription({
      clinicId,
      stripeCustomerId: `rzp_${Date.now()}`,
      plan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: expiresAt,
    });
  } else {
    subscription.plan = plan;
    subscription.status = 'active';
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = expiresAt;
    subscription.cancelAtPeriodEnd = false;
    subscription.canceledAt = null;
  }
  await subscription.save();

  return {
    success: true,
    clinic,
    subscription,
    expiresAt,
  };
}

/**
 * Get payment status
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const transaction = await Transaction.findOne({ transactionId: orderId })
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction,
      status: transaction.paymentStatus,
      paidAt: transaction.paidAt,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get payment history for a user
 */
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const transactions = await Transaction.find({ patientId: patient._id })
      .populate('doctorId', 'name')
      .populate('telemedicineId', 'status createdAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};