import Stripe from 'stripe';
import Subscription from '../models/Subscription.js';
import Clinic from '../models/Clinic.js';
import { STRIPE_PLANS, getPlanKeyByPriceId } from '../config/plans.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

// ─────────────────────────────────────────────────────────
// Helper: get or create the Stripe customer for a clinic
// ─────────────────────────────────────────────────────────
async function getOrCreateStripeCustomer(clinic, subscription) {
  if (subscription.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: clinic.email,
    name:  clinic.name,
    metadata: { clinicId: String(clinic._id) },
  });

  subscription.stripeCustomerId = customer.id;
  await subscription.save();
  return customer.id;
}

// ─────────────────────────────────────────────────────────
// GET /api/clinic/payments/plans
// Public — list available plans with prices
// ─────────────────────────────────────────────────────────
export async function getPlans(req, res) {
  try {
    const plans = Object.entries(STRIPE_PLANS).map(([key, plan]) => ({
      key,
      name:     plan.name,
      amount:   plan.amount,
      currency: plan.currency,
      interval: plan.interval,
      priceId:  plan.priceId ?? null,
    }));
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────
// GET /api/clinic/payments/subscription
// Auth required (admin only)
// ─────────────────────────────────────────────────────────
export async function getSubscription(req, res) {
  try {
    const sub = await Subscription.findOne({ clinicId: req.user.clinicId });
    if (!sub) {
      return res.json({
        success: true,
        subscription: null,
        plan: 'lite',
        status: 'free',
      });
    }
    res.json({
      success: true,
      subscription: {
        plan:              sub.plan,
        status:            sub.status,
        currentPeriodEnd:  sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        latestInvoiceUrl:  sub.latestInvoiceUrl,
        trialEnd:          sub.trialEnd,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/clinic/payments/create-checkout-session
// Body: { plan: 'lite' | 'plus' | 'pro' }
// Auth required (admin only)
// ─────────────────────────────────────────────────────────
export async function createCheckoutSession(req, res) {
  try {
    const { plan } = req.body;

    if (!['lite', 'plus', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan. Choose lite, plus, or pro.' });
    }

    const planConfig = STRIPE_PLANS[plan];
    if (!planConfig.priceId) {
      return res.status(500).json({ success: false, message: `Stripe Price ID not configured for plan: ${plan}` });
    }

    const clinicId = req.user.clinicId;

    // Fetch full clinic doc — need email + name for Stripe customer creation
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ success: false, message: 'Clinic not found.' });
    }

    // Get or create Subscription record
    let sub = await Subscription.findOne({ clinicId });
    if (!sub) {
      sub = new Subscription({ clinicId, stripeCustomerId: '' });
    }

    const customerId = await getOrCreateStripeCustomer(clinic, sub);

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/clinic/dashboard?payment=success&plan=${plan}`,
      cancel_url:  `${process.env.CLIENT_URL}/clinic/dashboard?payment=canceled`,
      metadata: {
        clinicId: String(clinicId),
        plan,
      },
      subscription_data: {
        metadata: {
          clinicId: String(clinicId),
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    res.json({ success: true, url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/clinic/payments/create-portal-session
// Auth required (admin only)
// ─────────────────────────────────────────────────────────
export async function createPortalSession(req, res) {
  try {
    const sub = await Subscription.findOne({ clinicId: req.user.clinicId });

    if (!sub?.stripeCustomerId) {
      return res.status(400).json({ success: false, message: 'No billing account found. Subscribe to a plan first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/clinic/dashboard`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/clinic/payments/cancel
// Auth required (admin only)
// ─────────────────────────────────────────────────────────
export async function cancelSubscription(req, res) {
  try {
    const sub = await Subscription.findOne({ clinicId: req.user.clinicId });

    if (!sub?.stripeSubscriptionId) {
      return res.status(400).json({ success: false, message: 'No active subscription found.' });
    }

    if (sub.cancelAtPeriodEnd) {
      return res.status(400).json({ success: false, message: 'Subscription is already set to cancel.' });
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    sub.cancelAtPeriodEnd = true;
    sub.canceledAt = new Date();
    await sub.save();

    res.json({
      success: true,
      message: 'Subscription will cancel at the end of the billing period.',
      currentPeriodEnd: new Date(updated.current_period_end * 1000),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/clinic/payments/reactivate
// Auth required (admin only)
// ─────────────────────────────────────────────────────────
export async function reactivateSubscription(req, res) {
  try {
    const sub = await Subscription.findOne({ clinicId: req.user.clinicId });

    if (!sub?.stripeSubscriptionId) {
      return res.status(400).json({ success: false, message: 'No active subscription found.' });
    }

    if (!sub.cancelAtPeriodEnd) {
      return res.status(400).json({ success: false, message: 'Subscription is not scheduled to cancel.' });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    sub.cancelAtPeriodEnd = false;
    sub.canceledAt = null;
    await sub.save();

    res.json({ success: true, message: 'Subscription reactivated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}