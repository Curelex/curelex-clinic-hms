// ims-backend/src/routes/supplierRoutes.js
import express from 'express';
import {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,   // ← was missing
  supplierHistory,
  recordPayment,    // ← was missing
} from "../controllers/supplierController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizePermissions } from "../middleware/authorize.js";

const router = express.Router();

router.use(protect);

router.get("/",                        authorizePermissions("suppliers.read"),  listSuppliers);
router.get("/:id/history",             authorizePermissions("suppliers.read"),  supplierHistory);
router.post("/",                       authorizePermissions("suppliers.write"), createSupplier);
router.put("/:id",                     authorizePermissions("suppliers.write"), updateSupplier);
router.delete("/:id",                  authorizePermissions("suppliers.write"), deleteSupplier);          // ← new
router.post("/:id/record-payment",     authorizePermissions("suppliers.write"), recordPayment);           // ← new

export default router;