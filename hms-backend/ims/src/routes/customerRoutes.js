// ims-backend/src/routes/customerRoutes.js
import express from 'express';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,   // ← was missing
  customerHistory,
  clearDues,        // ← was missing
} from "../controllers/customerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizePermissions } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get("/",                  listCustomers);
router.post("/",                 authorizePermissions("customers.write"), createCustomer);
router.put("/:id",               authorizePermissions("customers.write"), updateCustomer);
router.delete("/:id",            authorizePermissions("customers.write"), deleteCustomer);  // ← new
router.get("/:id/history",       customerHistory);
router.post("/:id/clear-dues",   authorizePermissions("customers.write"), clearDues);       // ← new

export default router;