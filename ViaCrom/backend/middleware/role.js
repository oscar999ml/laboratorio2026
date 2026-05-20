const HIERARCHY = {
  super_admin: 100,
  sistema: 90,
  admin_regional: 80,
  moderador: 60,
  verificador: 40,
  premium: 30,
  usuario: 20,
  observador: 5,
};

function requireRole(minRole) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const userLevel = HIERARCHY[userRole] || 0;
    const requiredLevel = HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Se requiere rol ${minRole} o superior. Tu rol: ${userRole}`
      });
    }

    next();
  };
}

function requireExactRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Se requiere rol exacto: ${role}` });
    }
    next();
  };
}

module.exports = { requireRole, requireExactRole, HIERARCHY };
