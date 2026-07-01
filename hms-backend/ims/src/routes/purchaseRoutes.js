// ims-backend/src/routes/purchaseRoutes.js
import express from 'express';
import {
  listPurchases,
  createPurchase,
  updatePurchaseStatus,   // ← was missing
} from "../controllers/purchaseController.js";
import { protect } from "../middleware/authMiddleware.js";
import validateRequest from "../middleware/validateRequest.js";
import { purchaseValidator } from "../middleware/validators.js";
import { authorizePermissions } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get("/",          authorizePermissions("purchases.read"),  listPurchases);
router.post("/",         authorizePermissions("purchases.write"), purchaseValidator, validateRequest, createPurchase);
router.patch("/:id/status", authorizePermissions("purchases.write"), updatePurchaseStatus);  // ← new

export default router;