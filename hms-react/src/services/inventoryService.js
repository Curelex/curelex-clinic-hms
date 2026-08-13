// hms-react/src/services/inventoryService.js
import API from '../utils/api';

const inventoryService = {
  // Inventory Items
  getItems: (params) => API.get('/inventory', { params }),
  getItem: (id) => API.get(`/inventory/${id}`),
  createItem: (data) => API.post('/inventory', data),
  updateItem: (id, data) => API.put(`/inventory/${id}`, data),
  deleteItem: (id) => API.delete(`/inventory/${id}`),
  
  // Stock Transactions
  addTransaction: (id, data) => API.post(`/inventory/${id}/transaction`, data),
  getTransactions: (id, limit = 50) => API.get(`/inventory/${id}/transactions?limit=${limit}`),
  
  // Alerts & Reports
  getLowStock: (clinicId) => API.get(`/inventory/alerts/low-stock?clinicId=${clinicId}`),
  getOutOfStock: (clinicId) => API.get(`/inventory/alerts/out-of-stock?clinicId=${clinicId}`),
  getDueMaintenance: (clinicId) => API.get(`/inventory/alerts/due-maintenance?clinicId=${clinicId}`),
  getOverdueMaintenance: (clinicId) => API.get(`/inventory/alerts/overdue-maintenance?clinicId=${clinicId}`),
  getValuation: (category, clinicId) => API.get(`/inventory/reports/valuation${category ? `?category=${category}` : ''}${clinicId ? `&clinicId=${clinicId}` : ''}`),
  
  // Equipment specific
  getEquipment: (params) => API.get('/inventory/equipment', { params }),
  logMaintenance: (id, data) => API.post(`/inventory/${id}/maintenance`, data),
  getMaintenanceHistory: (id) => API.get(`/inventory/${id}/maintenance-history`),
  
  // ── IMS Analytics - FIXED PATHS ──
  getIMSDashboardStats: (clinicId) => API.get(`/v1/ims/dashboard?clinicId=${clinicId}`),
  getIMSSales: (params) => API.get('/v1/ims/sales', { params }),
  getIMSProducts: (params) => API.get('/v1/ims/products', { params }),
};

export default inventoryService;