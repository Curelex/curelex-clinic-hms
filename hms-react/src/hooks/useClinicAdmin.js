// hooks/useClinicAdmin.js
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const STATUS_TO_CLINIC = { Waiting: 'waiting', Called: 'called', Done: 'done', Skipped: 'waiting', Pending: 'waiting' };
const STATUS_TO_TOKEN  = { waiting: 'Waiting', called: 'Called', done: 'Done' };

// Derives paid/dues purely from existing fields — no schema changes.
function derivePayment(t) {
  const fee = t.consultationFee || 0;
  if (t.paymentStatus === 'paid')    return { paid: t.paymentAmount || fee, dues: 0 };
  if (t.paymentStatus === 'partial') return { paid: t.paymentAmount || 0, dues: Math.max(fee - (t.paymentAmount || 0), 0) };
  if (t.paymentStatus === 'refunded') return { paid: 0, dues: 0 };
  return { paid: 0, dues: fee }; // 'pending'
}

function tokenToPatient(t) {
  const { paid, dues } = derivePayment(t);
  const isReceptionist = t.generatedBy?.role === 'receptionist';
  return {
    _id: t._id,
    token: t.tokenNumber,
    date: t.date,
    time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '',
    name: t.patientName,
    age: t.age,
    gender: t.gender,
    phone: t.phone,
    symptoms: t.symptoms || '',
    doctorId: t.doctor?._id || t.doctor,
    doctorName: t.doctor?.name || '',
    paid,
    dues,
    paymentMethod: t.paymentMethod || 'cash',
    status: STATUS_TO_CLINIC[t.status] || 'waiting',
    followUpDate: t.followUpDate || null,
    followUpNote: t.followUpNote || '',
    receptionistId: isReceptionist ? t.generatedBy._id : null,
    receptionistName: isReceptionist ? t.generatedBy.name : '',
    createdAt: t.createdAt,
  };
}

export function useClinicAdmin() {
  const { user, logout } = useAuth();

  return {
    session: user,
    logout,
    activePlan: user?.activePlan || 'lite',

    refreshClinic: () => API.get('/clinics/me').then(r => r.data),
    saveClinic:    (updates) => API.put('/clinics/me', updates).then(r => r.data),

    getUsers:   () => API.get('/auth/users').then(r => r.data),
    addUser:    (data) => API.post('/auth/users', data).then(r => r.data),
    updateUser: (id, data) => API.put(`/auth/users/${id}`, data).then(r => r.data),
    deleteUser: (id) => API.delete(`/auth/users/${id}`).then(r => r.data),
    updateTokenLimit: (doctorId, limit) =>
      API.put(`/auth/users/${doctorId}`, { dailyTokenLimit: limit }).then(r => r.data),

    getPatients: () =>
      API.get('/tokens').then(r => (r.data.tokens || []).map(tokenToPatient)),

    updatePatientStatus: (id, status) =>
      API.patch(`/tokens/${id}/status`, { status: STATUS_TO_TOKEN[status] || 'Waiting' })
         .then(r => tokenToPatient(r.data.token)),

    updateFollowUp: (id, followUpDate, followUpNote) =>
      API.patch(`/tokens/${id}/follow-up`, { followUpDate, followUpNote })
         .then(r => tokenToPatient(r.data)),

    getRevenueReport: () => Promise.resolve({ ok: false, status: 501, json: async () => ({ message: 'Not implemented yet' }) }),
  };
}