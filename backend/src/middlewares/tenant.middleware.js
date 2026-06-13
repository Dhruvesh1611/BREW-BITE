const tenantMiddleware = (req, res, next) => {
  if (!req.user || !req.user.shopId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }

  req.tenant = {
    shopId: req.user.shopId,
  };

  next();
};

module.exports = { tenantMiddleware };