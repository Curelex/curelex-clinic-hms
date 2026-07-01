
export const ROLES = {
  SUPER_ADMIN:    'super_admin',
  ADMIN:          'admin',
  DOCTOR:         'doctor',
  NURSE:          'nurse',
  RECEPTIONIST:   'receptionist', 
  PHARMACIST:     'pharmacist',
  LAB_TECHNICIAN: 'lab_technician',
  PATIENT:        'patient',
};

// ── Permission sets ───────────────────────────────────────────────────────
export const STAFF_PERMISSIONS = {
  // Assigned to receptionist-role users who access IMS for sales & billing
  SALES_BILLING: [
    'products.read',
    'products.write',
    'sales.create',
    'sales.read',
    'sales.invoice',
    'customers.read',
    'customers.write',
    'suppliers.read',
    'suppliers.write',
    'purchases.read',
    'purchases.write',
    'inventory.adjust',
  ],
};