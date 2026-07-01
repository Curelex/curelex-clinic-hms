// ims-backend/src/middleware/roleCheck.js
// Usage: router.get('/route', protect, roleCheck('admin', 'doctor'), handler)

export default function (...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    // super_admin always passes
    if (req.user?.role === 'super_admin') return next();
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    next();
  };
}