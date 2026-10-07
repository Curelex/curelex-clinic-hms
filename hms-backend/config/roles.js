export const CREATABLE_ROLES = {
  super_admin:  ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  admin:        ['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  receptionist: [],   // receptionists cannot create staff
};

export const ROLE_PERMISSIONS_MAP = {
      admin:           ['dashboard', 'patients', 'ipd', 'billing', 'prescriptions', 'pharmacy', 'lab', 'inventory', 'room-settings', 'staff', 'telemedicine'],
      doctor:          ['dashboard', 'patients', 'ipd', 'lab', 'prescriptions', 'telemedicine', 'followups'],
      separate_doctor: ['dashboard', 'patients', 'telemedicine'],
      nurse:           ['dashboard', 'patients', 'ipd'],
      receptionist:    ['dashboard', 'patients', 'billing', 'tokens', 'followups'],
      pharmacist:      [
        'dashboard', 'pharmacy', 'inventory',
        'suppliers.read', 'suppliers.write',
        'products.read', 'products.write',
        'purchases.read', 'purchases.write',
        'inventory.adjust',
        'sales.read', 'sales.create', 'sales.invoice',
        'customers.read', 'customers.write',
      ],
      lab_technician:  ['dashboard', 'patients', 'lab'],
    };
