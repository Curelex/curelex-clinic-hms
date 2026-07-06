import express from 'express';

import { cancelSubscription, createCheckoutSession, createPortalSession, getPlans, getSubscription, reactivateSubscription } from '../controller/paymentController.js';
import auth from '../middleware/auth.js';



const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────
// GET /api/clinic/payments/plans
router.get('/plans', getPlans);


router.use(auth);

// GET  /api/clinic/payments/subscription      → current plan & status
router.get('/subscription', getSubscription);

// POST /api/clinic/payments/create-checkout-session  → { plan }
router.post('/create-checkout-session', createCheckoutSession);

// POST /api/clinic/payments/create-portal-session    → manage billing
router.post('/create-portal-session', createPortalSession);

// POST /api/clinic/payments/cancel                   → cancel at period end
router.post('/cancel', cancelSubscription);

// POST /api/clinic/payments/reactivate               → undo cancel
router.post('/reactivate', reactivateSubscription);

export default router;