// hooks/useClinicAdmin.js
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const STATUS_TO_CLINIC = { Waiting: 'waiting', Called: 'called', Done: 'done', Skipped: 'waiting', Pending: 'waiting' };
const STATUS_TO_TOKEN = { waiting: 'Waiting', called: 'Called', done: 'Done' };

// Derives paid/dues purely from existing fields — no schema changes.
function derivePayment(t) {
  const fee = t.consultationFee || 0;
  if (t.paymentStatus === 'paid') return { paid: t.paymentAmount || fee, dues: 0 };
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
  const { user, logout, getEffectiveClinicId, clinicType, activePlan } = useAuth();

  // ── Helper to get clinic ID ──
  const getClinicId = useCallback(() => {
    return getEffectiveClinicId() || user?.clinicId;
  }, [getEffectiveClinicId, user?.clinicId]);

  // ── Helper to handle API errors ──
  const handleApiError = useCallback((error, defaultMessage) => {
    console.error(error);
    const message = error.response?.data?.message || error.message || defaultMessage;
    throw new Error(message);
  }, []);

  // ── Clinic Management ──
  const refreshClinic = useCallback(async () => {
    try {
      const clinicId = getClinicId();
      if (!clinicId) {
        throw new Error('No clinic ID found');
      }
      const response = await API.get(`/clinics/me`);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to refresh clinic data');
    }
  }, [getClinicId, handleApiError]);

  const saveClinic = useCallback(async (updates) => {
    try {
      const clinicId = getClinicId();
      if (!clinicId) {
        throw new Error('No clinic ID found');
      }
      const response = await API.put('/clinics/me', updates);
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to save clinic data');
    }
  }, [getClinicId, handleApiError]);

  // ── User Management ──
  const getUsers = useCallback(async () => {
    try {
      const clinicId = getClinicId();
      const params = clinicId ? { clinicId } : {};
      const response = await API.get('/auth/users', { params });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to fetch users');
    }
  }, [getClinicId, handleApiError]);

  const addUser = useCallback(async (data) => {
    try {
      const clinicId = getClinicId();
      if (!clinicId && data.role !== 'separate_doctor') {
        throw new Error('No clinic ID found');
      }
      const response = await API.post('/auth/users', {
        ...data,
        clinicId: data.clinicId || clinicId
      });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to add user');
    }
  }, [getClinicId, handleApiError]);

  const updateUser = useCallback(async (id, data) => {
    try {
      const clinicId = getClinicId();
      const response = await API.put(`/auth/users/${id}`, {
        ...data,
        clinicId: data.clinicId || clinicId
      });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to update user');
    }
  }, [getClinicId, handleApiError]);

  const deleteUser = useCallback(async (id) => {
    try {
      const clinicId = getClinicId();
      await API.delete(`/auth/users/${id}`, {
        data: { clinicId }
      });
      return true;
    } catch (error) {
      return handleApiError(error, 'Failed to delete user');
    }
  }, [getClinicId, handleApiError]);

  const updateTokenLimit = useCallback(async (doctorId, limit) => {
    try {
      const response = await API.put(`/auth/users/${doctorId}`, {
        dailyTokenLimit: limit
      });
      return response.data;
    } catch (error) {
      return handleApiError(error, 'Failed to update token limit');
    }
  }, [handleApiError]);

  // ── Patient Management ──
  const getPatients = useCallback(async () => {
    try {
      const clinicId = getClinicId();
      const params = clinicId ? { clinicId } : {};
      const response = await API.get('/tokens', { params });
      return (response.data.tokens || []).map(tokenToPatient);
    } catch (error) {
      return handleApiError(error, 'Failed to fetch patients');
    }
  }, [getClinicId, handleApiError]);

  const updatePatientStatus = useCallback(async (id, status) => {
    try {
      const response = await API.patch(`/tokens/${id}/status`, {
        status: STATUS_TO_TOKEN[status] || 'Waiting'
      });
      return tokenToPatient(response.data.token);
    } catch (error) {
      return handleApiError(error, 'Failed to update patient status');
    }
  }, [handleApiError]);

  const updateFollowUp = useCallback(async (id, followUpDate, followUpNote) => {
    try {
      const response = await API.patch(`/tokens/${id}/follow-up`, {
        followUpDate,
        followUpNote
      });
      return tokenToPatient(response.data);
    } catch (error) {
      return handleApiError(error, 'Failed to update follow-up');
    }
  }, [handleApiError]);

  // ── Revenue Management ──
  const getRevenueReport = useCallback(async (fromDate, toDate) => {
    try {
      const clinicId = getClinicId();
      if (!clinicId) {
        throw new Error('No clinic ID found');
      }
      const response = await API.get('/clinics/revenue-report', {
        params: {
          clinicId,
          fromDate,
          toDate,
          clinicType
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn('Revenue report endpoint not implemented yet');
        return {
          totalSales: 0,
          totalProfit: 0,
          totalOrders: 0,
          pharmacists: []
        };
      }
      return handleApiError(error, 'Failed to fetch revenue report');
    }
  }, [getClinicId, clinicType, handleApiError]);

  // ── Helper to check if user is clinic admin ──
  const isClinicAdmin = useCallback(() => {
    return user?.role === 'admin' && clinicType === 'clinic';
  }, [user?.role, clinicType]);

  // ── Helper to check if user is hospital admin ──
  const isHospitalAdmin = useCallback(() => {
    return user?.role === 'admin' && clinicType === 'hospital';
  }, [user?.role, clinicType]);

  // ── Get clinic type ──
  const getClinicType = useCallback(() => {
    return clinicType;
  }, [clinicType]);

  return {
    session: user,
    logout,
    activePlan: activePlan || 'free', 
    clinicType,

    refreshClinic,
    saveClinic,
    getUsers,
    addUser,
    updateUser,
    deleteUser,
    updateTokenLimit,
    getPatients,
    updatePatientStatus,
    updateFollowUp,
    getRevenueReport,

    isClinicAdmin,
    isHospitalAdmin,
    getClinicType,
    
  };
}