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
import { isPaymentTest, isPaymentLive } from '../services/paymentMode.js';

function generateReceipt(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

// ── Helper: Process payment bypass for test mode ──
async function processTestPayment(transaction, type) {
  // Generate a mock payment ID
  const mockPaymentId = `mock_pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  // Update transaction as paid
  transaction.paymentStatus = 'paid';
  transaction.paidAt = new Date();
  transaction.paymentDetails = {
    ...transaction.paymentDetails,
    razorpayPaymentId: mockPaymentId,
    paymentMethod: 'test_mode',
    isTestMode: true,
  };
  await transaction.save();

  // Process based on type
  const notes = transaction.paymentDetails?.notes || {};
  const paymentType = notes.type || type;

  let result = { success: true, transaction, testMode: true };

  switch (paymentType) {
    case 'telemedicine':
      result = await handleTelemedicinePayment(transaction, { id: mockPaymentId, method: 'test_mode' });
      break;
    case 'billing':
      result = await handleBillPayment(transaction, { amount: transaction.amount });
      break;
    case 'subscription':
      result = await handleSubscriptionPayment(transaction, { amount: transaction.amount });
      break;
    default:
      console.warn('Unknown payment type:', paymentType);
  }

  return result;
}

// ── Create Telemedicine Order ──
export const createTelemedicineOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const telemedicine = await Telemedicine.findById(id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name');

    if (!telemedicine) {
      return res.status(404).json({ success: false, message: 'Telemedicine request not found' });
    }

    const patient = await Patient.findOne({ userId });
    if (!patient || String(patient._id) !== String(telemedicine.patientId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (telemedicine.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

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
    
    // ── Check payment mode ──
    if (isPaymentTest()) {
      // ── TEST MODE: Skip Razorpay, process immediately ──
      const transaction = new Transaction({
        patientId: patient._id,
        doctorId: telemedicine.doctorId,
        clinicId: telemedicine.clinicId || null,
        telemedicineId: telemedicine._id,
        amount,
        doctorFee: amount,
        paymentStatus: 'pending',
        paymentMethod: 'test_mode',
        transactionId: `TEST_${receipt}`,
        paymentGateway: 'test_mode',
        paymentDetails: {
          receipt,
          isTestMode: true,
          notes: {
            type: 'telemedicine',
            telemedicineId: String(telemedicine._id),
            patientId: String(patient._id),
            doctorId: String(telemedicine.doctorId),
          },
        },
      });
      await transaction.save();

      // Process payment immediately in test mode
      const result = await processTestPayment(transaction, 'telemedicine');
      
      return res.json({
        success: true,
        testMode: true,
        message: 'Test mode: Payment bypassed successfully',
        orderId: transaction.transactionId,
        amount: result.transaction.amount,
        currency: 'INR',
        receipt,
        telemedicineId: telemedicine._id,
        transactionId: transaction._id,
        paymentResult: result,
      });
    }

    // ── LIVE MODE: Use Razorpay ──
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

    const transaction = new Transaction({
      patientId: patient._id,
      doctorId: telemedicine.doctorId,
      clinicId: telemedicine.clinicId || null,
      telemedicineId: telemedicine._id,
      amount,
      doctorFee: amount,
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

// ── Create Bill Order ──
export const createBillOrder = async (req, res) => {
  try {
    const { billId } = req.params;
    const userId = req.user.id;

    const bill = await Billing.findById(billId).populate('patient', 'name email phone');
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const patient = await Patient.findOne({ userId });
    if (!patient || String(patient._id) !== String(bill.patient._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const remainingAmount = bill.totalAmount - (bill.paidAmount || 0);
    if (remainingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Bill already paid' });
    }

    const receipt = generateReceipt('BILL');

    // ── Check payment mode ──
    if (isPaymentTest()) {
      // ── TEST MODE: Skip Razorpay ──
      const transaction = new Transaction({
        patientId: patient._id,
        doctorId: null,
        clinicId: bill.clinicId || null,
        telemedicineId: null,
        amount: remainingAmount,
        doctorFee: 0,
        paymentStatus: 'pending',
        paymentMethod: 'test_mode',
        transactionId: `TEST_${receipt}`,
        paymentGateway: 'test_mode',
        paymentDetails: {
          receipt,
          isTestMode: true,
          billId: bill._id,
          notes: {
            type: 'billing',
            billId: String(bill._id),
            billNumber: bill.billId || bill._id.toString(),
            patientId: String(patient._id),
          },
        },
        notes: `Payment for bill ${bill.billId || bill._id}`,
      });
      await transaction.save();

      // Process payment immediately in test mode
      const result = await processTestPayment(transaction, 'billing');

      return res.json({
        success: true,
        testMode: true,
        message: 'Test mode: Payment bypassed successfully',
        orderId: transaction.transactionId,
        amount: result.transaction.amount,
        currency: 'INR',
        receipt,
        billId: bill._id,
        remainingAmount,
        transactionId: transaction._id,
        paymentResult: result,
      });
    }

    // ── LIVE MODE: Use Razorpay ──
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

// ── Create Plan Order ──
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

    // ── Check payment mode ──
    if (isPaymentTest()) {
      // ── TEST MODE: Skip Razorpay ──
      const transaction = new Transaction({
        patientId: null,
        doctorId: null,
        clinicId: clinic._id,
        telemedicineId: null,
        amount,
        doctorFee: 0,
        paymentStatus: 'pending',
        paymentMethod: 'test_mode',
        transactionId: `TEST_${receipt}`,
        paymentGateway: 'test_mode',
        paymentDetails: {
          receipt,
          isTestMode: true,
          notes: {
            type: 'subscription',
            clinicId: String(clinic._id),
            plan,
            clinicName: clinic.name,
            userEmail: user.email,
            userId: String(user._id),
          },
        },
      });
      await transaction.save();

      // Process payment immediately in test mode
      const result = await processTestPayment(transaction, 'subscription');

      return res.json({
        success: true,
        testMode: true,
        message: 'Test mode: Plan activated successfully',
        orderId: transaction.transactionId,
        amount: result.transaction.amount,
        currency: 'INR',
        receipt,
        plan,
        clinicId: clinic._id,
        paymentResult: result,
      });
    }

    // ── LIVE MODE: Use Razorpay ──
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

// ── Verify Payment ──
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, type } = req.body;

    // ── Check if it's a test mode transaction ──
    if (orderId && orderId.startsWith('TEST_')) {
      const transaction = await Transaction.findOne({ transactionId: orderId });
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      if (transaction.paymentStatus === 'paid') {
        return res.json({ success: true, message: 'Already verified', transaction });
      }

      // Process test payment
      const result = await processTestPayment(transaction, type);
      return res.json({
        success: true,
        testMode: true,
        message: 'Test mode: Payment verified',
        ...result,
      });
    }

    // ── LIVE MODE: Verify with Razorpay ──
    const isValid = razorpayService.verifyPayment({ orderId, paymentId, signature });
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const transaction = await Transaction.findOne({ transactionId: orderId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Already verified', transaction });
    }

    const paymentResult = await razorpayService.getPayment(paymentId);
    if (!paymentResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch payment details' });
    }

    const payment = paymentResult.payment;

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

// ── Payment status ──
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
      testMode: transaction.paymentDetails?.isTestMode || false,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Payment history ──
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

// ── Payment handlers (unchanged) ──
async function handleTelemedicinePayment(transaction, payment) {
  const telemedicine = await Telemedicine.findById(transaction.telemedicineId);
  if (!telemedicine) {
    throw new Error('Telemedicine request not found');
  }

  telemedicine.paymentStatus = 'paid';
  telemedicine.status = 'payment_completed';
  telemedicine.paidAt = new Date();
  telemedicine.paymentMethod = transaction.paymentDetails?.isTestMode ? 'test_mode' : 'razorpay';
  telemedicine.paymentDetails = {
    razorpayPaymentId: payment.id,
    razorpayAmount: payment.amount,
    razorpayCurrency: payment.currency,
    method: payment.method || 'test_mode',
    isTestMode: transaction.paymentDetails?.isTestMode || false,
  };
  telemedicine.doctorPayoutStatus = 'pending';
  telemedicine.doctorPayoutAmount = telemedicine.consultationFee;

  if (!telemedicine.meetingLink) {
    const meetingId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    telemedicine.meetingId = meetingId;
    telemedicine.meetingLink = `https://meet.jit.si/Curelex-${meetingId}`;
    telemedicine.status = 'scheduled';
  }

  await telemedicine.save();

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

async function handleBillPayment(transaction, payment) {
  const billId = transaction.paymentDetails?.billId;
  if (!billId) {
    throw new Error('Bill ID not found in transaction');
  }

  const bill = await Billing.findById(billId);
  if (!bill) {
    throw new Error('Bill not found');
  }

  const paidAmount = transaction.amount / 100 || transaction.amount;
  bill.paidAmount = (bill.paidAmount || 0) + paidAmount;

  if (bill.paidAmount >= bill.totalAmount) {
    bill.paymentStatus = 'Paid';
  } else {
    bill.paymentStatus = 'Partial';
  }

  bill.paymentMethod = transaction.paymentDetails?.isTestMode ? 'Test Mode' : 'Card';
  await bill.save();

  return {
    success: true,
    bill,
    transaction,
    remainingAmount: bill.totalAmount - bill.paidAmount,
  };
}

async function handleSubscriptionPayment(transaction, payment) {
  const notes = transaction.paymentDetails?.notes || {};
  const clinicId = notes.clinicId;
  const plan = notes.plan;

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

  clinic.plan = plan;
  clinic.planActivatedAt = now.toISOString().split('T')[0];
  clinic.planExpiresAt = expiresAt.toISOString().split('T')[0];
  clinic.planStatus = 'active';
  clinic.gracePeriodEndsAt = null;
  clinic.isDataLocked = false;
  await clinic.save();

  let subscription = await Subscription.findOne({ clinicId });
  if (!subscription) {
    subscription = new Subscription({
      clinicId,
      razorpayCustomerId: `rzp_${Date.now()}`,
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
    transaction,
    clinic,
    subscription,
    expiresAt,
  };
}