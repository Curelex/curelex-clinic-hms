// hms-backend/webhooks/razorpayWebhook.js
import express from 'express';
import crypto from 'crypto';
import razorpayService from '../services/razorpayService.js';
import Transaction from '../models/Transaction.js';
import Telemedicine from '../models/Telemedicine.js';
import Billing from '../models/Billing.js';
import Clinic from '../models/Clinic.js';
import Subscription from '../models/Subscription.js';
import mongoose from 'mongoose';

const router = express.Router();

// Webhook secret verification
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

router.post('/razorpay', async (req, res) => {
  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Invalid webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;
    console.log('Razorpay webhook event:', event.event);

    // Handle different events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      case 'refund.created':
        await handleRefundCreated(event.payload.refund.entity);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.subscription.entity);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Handle payment captured
 */
async function handlePaymentCaptured(payment) {
  console.log('Payment captured:', payment.id, payment.amount);

  const transaction = await Transaction.findOne({ transactionId: payment.order_id });

  if (!transaction) {
    console.warn('Transaction not found for order:', payment.order_id);
    return;
  }

  if (transaction.paymentStatus === 'paid') {
    console.log('Transaction already paid:', transaction.transactionId);
    return;
  }

  // Update transaction
  transaction.paymentStatus = 'paid';
  transaction.paidAt = new Date();
  transaction.paymentDetails = {
    ...transaction.paymentDetails,
    razorpayPaymentId: payment.id,
    paymentMethod: payment.method,
    cardDetails: payment.card ? {
      last4: payment.card.last4,
      network: payment.card.network,
      bank: payment.card.bank,
    } : null,
    capturedAt: payment.created_at,
  };
  await transaction.save();

  // Process based on payment type
  const notes = transaction.paymentDetails?.notes || {};
  const paymentType = notes.type;

  try {
    switch (paymentType) {
      case 'telemedicine':
        await processTelemedicinePayment(transaction, payment);
        break;
      case 'billing':
        await processBillPayment(transaction, payment);
        break;
      case 'subscription':
        await processSubscriptionPayment(transaction, payment);
        break;
      default:
        console.warn('Unknown payment type:', paymentType);
    }
  } catch (err) {
    console.error('Error processing payment:', err);
  }
}

/**
 * Process telemedicine payment from webhook
 */
async function processTelemedicinePayment(transaction, payment) {
  const telemedicine = await Telemedicine.findById(transaction.telemedicineId);
  if (!telemedicine) {
    console.warn('Telemedicine not found:', transaction.telemedicineId);
    return;
  }

  telemedicine.paymentStatus = 'paid';
  telemedicine.status = 'payment_completed';
  telemedicine.paidAt = new Date();
  telemedicine.paymentMethod = 'razorpay';
  telemedicine.paymentDetails = {
    razorpayPaymentId: payment.id,
    method: payment.method,
  };
  telemedicine.doctorPayoutStatus = 'pending';
  telemedicine.doctorPayoutAmount = telemedicine.consultationFee;

  if (!telemedicine.meetingLink) {
    const meetingId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    telemedicine.meetingId = meetingId;
    telemedicine.meetingLink = `https://meet.jit.si/Curelex-${meetingId}`;
  }

  await telemedicine.save();

  console.log('✅ Telemedicine payment processed:', telemedicine._id);
}

/**
 * Process bill payment from webhook
 */
async function processBillPayment(transaction, payment) {
  const billId = transaction.paymentDetails?.billId;
  if (!billId) {
    console.warn('Bill ID not found in transaction');
    return;
  }

  const bill = await Billing.findById(billId);
  if (!bill) {
    console.warn('Bill not found:', billId);
    return;
  }

  const paidAmount = payment.amount / 100;
  bill.paidAmount = (bill.paidAmount || 0) + paidAmount;

  if (bill.paidAmount >= bill.totalAmount) {
    bill.paymentStatus = 'Paid';
  } else {
    bill.paymentStatus = 'Partial';
  }

  await bill.save();
  console.log('✅ Bill payment processed:', bill.billId);
}

/**
 * Process subscription payment from webhook
 */
async function processSubscriptionPayment(transaction, payment) {
  const notes = transaction.paymentDetails?.notes || {};
  const clinicId = notes.clinicId;
  const plan = notes.plan;

  if (!clinicId || !plan) {
    console.warn('Clinic ID or plan not found');
    return;
  }

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    console.warn('Clinic not found:', clinicId);
    return;
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

  console.log('✅ Subscription processed:', clinicId, plan);
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(payment) {
  console.log('Payment failed:', payment.id, payment.error_description);

  const transaction = await Transaction.findOne({ transactionId: payment.order_id });
  if (transaction) {
    transaction.paymentStatus = 'failed';
    transaction.paymentDetails = {
      ...transaction.paymentDetails,
      error: payment.error_description || payment.error_reason,
    };
    await transaction.save();
  }
}

/**
 * Handle refund created
 */
async function handleRefundCreated(refund) {
  console.log('Refund created:', refund.id);

  const transaction = await Transaction.findOne({ 
    'paymentDetails.razorpayPaymentId': refund.payment_id 
  });

  if (transaction) {
    transaction.paymentStatus = 'refunded';
    transaction.paymentDetails = {
      ...transaction.paymentDetails,
      refundId: refund.id,
      refundAmount: refund.amount / 100,
      refundCreatedAt: refund.created_at,
    };
    await transaction.save();
  }
}

/**
 * Handle subscription charged
 */
async function handleSubscriptionCharged(subscription) {
  console.log('Subscription charged:', subscription.id);
  // Handle recurring subscription charge
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(subscription) {
  console.log('Subscription cancelled:', subscription.id);

  const clinicSubscription = await Subscription.findOne({ 
    stripeSubscriptionId: subscription.id 
  });

  if (clinicSubscription) {
    clinicSubscription.status = 'canceled';
    clinicSubscription.canceledAt = new Date();
    await clinicSubscription.save();

    const clinic = await Clinic.findById(clinicSubscription.clinicId);
    if (clinic) {
      clinic.planStatus = 'expired';
      clinic.isDataLocked = true;
      await clinic.save();
    }
  }
}

export default router;