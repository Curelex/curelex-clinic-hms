import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  apiLogout,
  getSession,
  removeToken,
  removeSession,
  setSession as persistSession,
  apiGetMyClinic,
  apiUpdateMyClinic,
  apiGetUsers,
  apiAddUser,
  apiUpdateUser,
  apiDeleteUser,
  apiGetPatients,
  apiAddPatient,
  apiUpdatePatientStatus,
  apiUpdateFollowUp,
  apiUpdateTokenLimit,
  apiGetMe,
  apiUploadPatientFile,
  apiGetPatientFiles,
  apiDownloadPatientFile,
  apiDeletePatientFile,
  apiGetPatientHistory,
  apiActivatePlan,
  apiGetRevenueReport,
  // ✅ NEW: Prescription APIs
  apiCreatePrescription,
  apiUpdatePrescription,
  apiGetPatientPrescriptions,
  apiGetTodayPrescriptions,
  apiGetPrescriptionsByDate,
  apiGetPrescriptionAutocomplete,
  apiMarkPrescriptionDispensed,
  apiMarkPrescriptionViewed,
} from '../utils/api';

const AppContext = createContext(null);

function normalizePlan(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s.includes('pro'))  return 'pro';
  if (s.includes('plus')) return 'plus';
  if (s.includes('lite')) return 'lite';
  if (['pro', 'plus', 'lite'].includes(s)) return s;
  return null;
}

function clearAllAuth() {
  removeToken();
  removeSession();
  localStorage.removeItem('ims_token');
  localStorage.removeItem('ims_sso_token');
  localStorage.removeItem('curelex_activePlan');
  sessionStorage.removeItem('sso_attempt');
}

export function AppProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  const [activePlan, setActivePlanState] = useState(
    () => normalizePlan(localStorage.getItem('curelex_activePlan'))
  );

  const setActivePlan = useCallback((planKey) => {
    const normalized = normalizePlan(planKey);
    if (normalized) {
      localStorage.setItem('curelex_activePlan', normalized);
    } else {
      localStorage.removeItem('curelex_activePlan');
    }
    setActivePlanState(normalized);
  }, []);

  const clearPlan = useCallback(() => {
    localStorage.removeItem('curelex_activePlan');
    setActivePlanState(null);
  }, []);

  useEffect(() => {
    const storedPlan     = normalizePlan(localStorage.getItem('curelex_activePlan'));
    const currentSession = getSession();

    if (storedPlan) setActivePlanState(storedPlan);

    if (currentSession) {
      apiGetMyClinic()
        .then((clinic) => {
          if (!clinic) return;
          const backendPlan =
            clinic?.plan ??
            clinic?.subscription?.plan ??
            clinic?.activePlan ??
            null;
          if (backendPlan) setActivePlan(backendPlan);
        })
        .catch((err) => {
          const msg = err?.message || '';
          if (
            msg.includes('401') ||
            msg.includes('Invalid') ||
            msg.includes('expired') ||
            msg.includes('Unauthorized')
          ) {
            clearAllAuth();
            setSessionState(null);
            setActivePlanState(null);
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSession = useCallback((sess) => {
    setSessionState(sess);
    if (sess) {
      persistSession(sess);
    } else {
      apiLogout();
      clearPlan();
    }
  }, [clearPlan]);

  const login = useCallback((sess) => {
    setSession(sess);

    const storedPlan = normalizePlan(localStorage.getItem('curelex_activePlan'));
    if (storedPlan) setActivePlanState(storedPlan);

    apiGetMyClinic()
      .then((clinic) => {
        if (!clinic) return;
        const backendPlan =
          clinic?.plan ??
          clinic?.subscription?.plan ??
          clinic?.activePlan ??
          null;
        if (backendPlan) setActivePlan(backendPlan);
      })
      .catch(() => {});
  }, [setSession, setActivePlan]);

  const logout = useCallback(() => {
    clearAllAuth();
    setSessionState(null);
    setActivePlanState(null);
  }, []);

  const refreshClinic = useCallback(() => apiGetMyClinic(), []);
  const saveClinic    = useCallback((updates) => apiUpdateMyClinic(updates), []);

  const getUsers   = useCallback(() => apiGetUsers(), []);
  const addUser    = useCallback((data) => apiAddUser(data), []);
  const updateUser = useCallback((userId, data) => apiUpdateUser(userId, data), []);
  const deleteUser = useCallback((userId) => apiDeleteUser(userId), []);
  const getMe      = useCallback(() => apiGetMe(), []);

  const updateTokenLimit = useCallback(
    (doctorId, limit) => apiUpdateTokenLimit(doctorId, limit), []
  );

  const getPatients         = useCallback((params = {}) => apiGetPatients(params), []);
  const addPatient          = useCallback((data) => apiAddPatient(data), []);
  const updatePatientStatus = useCallback(
    (patientId, status) => apiUpdatePatientStatus(patientId, status), []
  );
  const updateFollowUp = useCallback(
    (patientId, followUpDate, followUpNote) =>
      apiUpdateFollowUp(patientId, followUpDate, followUpNote), []
  );

  const uploadPatientFile = useCallback(
    (patientId, file) => apiUploadPatientFile(patientId, file), []
  );
  const getPatientFiles = useCallback(
    (patientId) => apiGetPatientFiles(patientId), []
  );
  const downloadPatientFile = useCallback(
    (patientId, fileId) => apiDownloadPatientFile(patientId, fileId), []
  );
  const deletePatientFile = useCallback(
    (patientId, fileId) => apiDeletePatientFile(patientId, fileId), []
  );

  const getPatientHistory = useCallback(
    (phone) => apiGetPatientHistory(phone), []
  );

  const activatePlan = useCallback(async (planKey) => {
    await apiActivatePlan(planKey);
    setActivePlan(planKey);
  }, [setActivePlan]);

  const getRevenueReport = useCallback(
    (from, to) => apiGetRevenueReport(from, to), []
  );

  // ✅ NEW: Prescription callbacks
  const createPrescription = useCallback(
    (data) => apiCreatePrescription(data), []
  );
  const updatePrescription = useCallback(
    (id, data) => apiUpdatePrescription(id, data), []
  );
  const getPatientPrescriptions = useCallback(
    (patientId) => apiGetPatientPrescriptions(patientId), []
  );
  const getTodayPrescriptions = useCallback(
    () => apiGetTodayPrescriptions(), []
  );
  const getPrescriptionsByDate = useCallback(
    (date) => apiGetPrescriptionsByDate(date), []
  );
  const getPrescriptionAutocomplete = useCallback(
    () => apiGetPrescriptionAutocomplete(), []
  );
  const markPrescriptionDispensed = useCallback(
    (id) => apiMarkPrescriptionDispensed(id), []
  );
  const markPrescriptionViewed = useCallback(
    (id) => apiMarkPrescriptionViewed(id), []
  );

  return (
    <AppContext.Provider value={{
      session, login, logout,
      activePlan, setActivePlan, clearPlan, activatePlan,
      refreshClinic, saveClinic,
      getUsers, addUser, updateUser, deleteUser, getMe,
      updateTokenLimit,
      getPatients, addPatient, updatePatientStatus, updateFollowUp,
      uploadPatientFile, getPatientFiles, downloadPatientFile, deletePatientFile,
      getPatientHistory, getRevenueReport,
      // ✅ NEW: Prescriptions
      createPrescription,
      updatePrescription,
      getPatientPrescriptions,
      getTodayPrescriptions,
      getPrescriptionsByDate,
      getPrescriptionAutocomplete,
      markPrescriptionDispensed,
      markPrescriptionViewed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}