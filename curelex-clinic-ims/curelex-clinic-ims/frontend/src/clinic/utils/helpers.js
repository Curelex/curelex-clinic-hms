// Unique ID generator
export function genId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// Today's date formatted
export function today() {
  return new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Current time formatted
export function currentTime() {
  return new Date().toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Load all clinics from localStorage
export function loadClinics() {
  try {
    return JSON.parse(localStorage.getItem('cf_clinics') || '[]');
  } catch {
    return [];
  }
}

// Save all clinics to localStorage
export function saveClinics(clinics) {
  localStorage.setItem('cf_clinics', JSON.stringify(clinics));
}

// Get one clinic by ID (always fresh from storage)
export function getClinic(clinicId) {
  return loadClinics().find((c) => c.id === clinicId) || null;
}

// Update one clinic in storage
export function updateClinic(updated) {
  const all = loadClinics();
  const idx = all.findIndex((c) => c.id === updated.id);
  if (idx === -1) return;
  all[idx] = updated;
  saveClinics(all);
}

// Super admin credentials (hardcoded for demo)
export const SUPER_ADMIN = {
  email: 'superadmin@clinicflow.pk',
  password: 'super@123',
};

// Next token number for a doctor today
export function nextTokenForDoctor(clinic, doctorId) {
  const todayStr = today();
  const existing = (clinic.patients || []).filter(
    (p) => p.doctorId === doctorId && p.date === todayStr
  );
  return existing.length + 1;
}