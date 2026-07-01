/**
 * Returns a Mongoose filter fragment scoping queries to the caller's clinic.
 * super_admin gets no restriction (empty object).
 */
export function getClinicFilter(user) {
  if (user?.role === 'super_admin') return {};
  return { clinicId: user.clinicId };
}