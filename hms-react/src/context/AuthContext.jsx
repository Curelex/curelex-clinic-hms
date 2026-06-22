// hms-react/src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import API from '../utils/api';
import { useSocket } from '../hooks/useSocket';

// ── Role → nav section permissions ───────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'patients', 'ipd', 'billing',
    'pharmacy', 'lab', 'inventory', 'staff', 'room-settings', 'telemedicine', 'prescriptions'
  ],
  doctor: [
    'dashboard', 'patients', 'ipd', 'lab', 'prescriptions', 'telemedicine'
  ],
  nurse: [
    'dashboard', 'patients', 'ipd',
  ],
  receptionist: [
    'dashboard', 'patients', 'billing', 'tokens',
  ],
  pharmacist: [
    'dashboard', 'pharmacy', 'inventory',
  ],
  lab_technician: [
    'dashboard', 'patients', 'lab',
  ],
  patient: [
    'patient-dashboard', 'appointments', 'prescriptions', 'profile', 'telemedicine'
  ],
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  
  // ── Socket Integration ──
  const { socket, isConnected, emit, on, off } = useSocket();
  const [doctorStatus, setDoctorStatus] = useState('offline');
  const [onlineDoctors, setOnlineDoctors] = useState([]);
  
  // ── Ref to track if socket is already set up ──
  const socketSetupDone = useRef(false);
  const userRef = useRef(user);

  // ── Keep userRef updated ──
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ── On app load: restore session from token ──
  useEffect(() => {
    const token = localStorage.getItem('hms_token');
    if (!token) {
      setAuthReady(true);
      return;
    }
    API.get('/auth/profile')
      .then(({ data }) => {
        console.log('📋 Profile loaded:', data);
        setUser(data.user || data);
        if (data.patient) {
          setPatient(data.patient);
        }
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        localStorage.removeItem('hms_token');
        localStorage.removeItem('user');
        setUser(null);
        setPatient(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);

  // ── Setup socket events when user is loaded ─────────────────────────────────
  // Runs once per user session. Uses the 'connect' event on the singleton socket
  // to re-register the doctor after any reconnect, so we never depend on
  // isConnected being in the dep array (which caused the online/offline flicker).
  useEffect(() => {
    if (!user || !socket) return;

    const doctorId = user._id || user.id;

    // ── Function that (re-)registers this user with the server ──────────────
    // Called immediately if connected, and again after every reconnect.
    const registerWithServer = () => {
      if (user.role === 'doctor') {
        socket.emit('doctor:join', doctorId);
        socket.emit('doctor:register-socket', { doctorId });
        socket.emit('doctor:status', {
          doctorId,
          status: 'online',
          clinicId: user.clinicId,
        });
        setDoctorStatus('online');
      }

      if (user.role === 'patient') {
        const clinicId = user.clinicId;
        if (clinicId) {
          socket.emit('patient:join-clinic', { clinicId, patientId: doctorId });
          socket.emit('doctor:get-online', { clinicId }, (doctors) => {
            setOnlineDoctors(doctors || []);
          });
        }
      }
    };

    // Register immediately if already connected, else wait for 'connect'
    if (socket.connected) {
      registerWithServer();
    }

    // Re-register on every reconnect (handles network blips transparently)
    socket.on('connect', registerWithServer);

    // ── Persistent event listeners ───────────────────────────────────────────
    const handleDoctorStatusChange = (data) => {
      setOnlineDoctors(prev => {
        if (data.status === 'online') {
          const exists = prev.find(d => String(d.doctorId) === String(data.doctorId));
          if (exists) {
            return prev.map(d =>
              String(d.doctorId) === String(data.doctorId)
                ? { ...d, lastSeen: data.timestamp }
                : d
            );
          }
          return [...prev, { doctorId: data.doctorId, lastSeen: data.timestamp, status: 'online' }];
        }
        return prev.filter(d => String(d.doctorId) !== String(data.doctorId));
      });
    };

    const handleOnlineList = ({ onlineDoctors: doctors }) => {
      setOnlineDoctors(doctors || []);
    };

    socket.on('doctor:status-change', handleDoctorStatusChange);
    socket.on('doctor:online-list', handleOnlineList);

    return () => {
      socket.off('connect', registerWithServer);
      socket.off('doctor:status-change', handleDoctorStatusChange);
      socket.off('doctor:online-list', handleOnlineList);
    };
  }, [user, socket]); // socket is stable singleton; user changes on login/logout

  // ── Doctor status management ──
  const setDoctorOnline = useCallback((status) => {
    if (!user || user.role !== 'doctor') return;
    
    const doctorId = user._id || user.id;
    console.log(`🔄 Setting doctor ${doctorId} to ${status}`);
    
    setDoctorStatus(status);
    emit('doctor:status', {
      doctorId: doctorId,
      status: status,
      clinicId: user.clinicId
    });
  }, [user, emit]);

  // ── Check if a specific doctor is online ──
  const isDoctorOnline = useCallback((doctorId) => {
    if (!doctorId) return false;
    const id = String(doctorId);
    return onlineDoctors.some(d => String(d.doctorId) === id);
  }, [onlineDoctors]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      console.log('✅ LOGIN SUCCESS:', data.user);
      
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      if (data.patient) {
        setPatient(data.patient);
        localStorage.setItem('patient', JSON.stringify(data.patient));
      }
      
      // Reset socket setup flag so new user can set up socket
      socketSetupDone.current = false;
      
      return { success: true, user: data.user, patient: data.patient };
    } catch (err) {
      console.error('❌ Login error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Register (Staff) ──────────────────────────────────────────────────────
  const register = async (formData) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      localStorage.setItem('hms_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      socketSetupDone.current = false;
      return { success: true };
    } catch (err) {
      console.error('❌ Register error:', err);
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // ── Patient Registration ──────────────────────────────────────────────────
  const registerPatient = async (formData) => {
    setLoading(true);
    try {
      const patientData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || '',
        clinicName: formData.clinicName,
        dob: formData.dob || null,
        age: formData.age || null,
        gender: formData.gender || null,
        bloodGroup: formData.bloodGroup || null,
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        emergencyContact: formData.emergencyContact || '',
        emergencyName: formData.emergencyName || '',
        emergencyRelation: formData.emergencyRelation || '',
        allergies: formData.allergies || '',
        chronicConditions: formData.chronicConditions || '',
        currentMedications: formData.currentMedications || '',
        medicalHistory: formData.medicalHistory || '',
        notes: formData.notes || '',
        assignedDoctor: formData.assignedDoctor || null,
      };
      
      const { data } = await API.post('/auth/register-patient', patientData);
      
      return { success: true, data };
    } catch (err) {
      console.error('❌ Patient register error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    // Mark doctor as offline before logging out
    if (user?.role === 'doctor') {
      const doctorId = user._id || user.id;
      console.log(`🔄 Logging out doctor ${doctorId}`);
      emit('doctor:status', {
        doctorId: doctorId,
        status: 'offline',
        clinicId: user.clinicId
      });
      setDoctorStatus('offline');
    }
    
    localStorage.removeItem('hms_token');
    localStorage.removeItem('user');
    localStorage.removeItem('patient');
    setUser(null);
    setPatient(null);
    socketSetupDone.current = false;
  };

  // ── Permission check ──────────────────────────────────────────────────────
  const hasPerm = (key) => {
    if (!user) return false;

    const role = user.role?.toLowerCase();

    // Admin sees everything
    if (role === 'admin') return true;

    // Check role-based nav permissions
    const roleNavPerms = ROLE_PERMISSIONS[role];
    if (roleNavPerms) return roleNavPerms.includes(key);

    return Array.isArray(user.permissions) && user.permissions.includes(key);
  };

  // ── Patient helper methods ──────────────────────────────────────────────
  const isPatient = () => user?.role === 'patient';
  const isDoctor = () => user?.role?.toLowerCase() === 'doctor';
  const isAdmin = () => user?.role?.toLowerCase() === 'admin';
  const isStaff = () => user && user?.role !== 'patient';
  const getUserId = () => user?.id || user?._id || null;
  const getUserName = () => user?.name || user?.fullName || 'User';
  const getUserEmail = () => user?.email || '';
  const getUserRole = () => user?.role || null;
  const isAuthenticated = () => !!user;
  const getPatientData = () => patient || null;

  if (!authReady) return null;

  const value = {
    user, 
    patient,
    login, 
    register, 
    logout, 
    loading, 
    hasPerm,
    
    isPatient,
    isDoctor,
    isAdmin,
    isStaff,
    getUserId,
    getUserName,
    getUserEmail,
    getUserRole,
    isAuthenticated,
    getPatientData,
    
    registerPatient,
    
    // ── Socket related ──
    socket,
    isConnected,
    doctorStatus,
    setDoctorOnline,
    onlineDoctors,
    isDoctorOnline,
    emit,
    on,
    off
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Custom hook to use auth context ──
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };