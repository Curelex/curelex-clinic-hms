const IMS_BASE = import.meta.env.VITE_IMS_API_URL || "https://curelex.in/ims/api/v1";

export async function registerPharmacistInIMS({ fullName, email, password }) {
  try {
    const res = await fetch(`${IMS_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    if (!res.ok && res.status !== 409) {
      const err = await res.json().catch(() => ({}));
      console.warn("IMS signup warning:", err.message || res.status);
    }
  } catch (e) {
    console.warn("IMS signup failed (non-fatal):", e.message);
  }
}

export async function loginPharmacistIntoIMS() {
  return true;
}