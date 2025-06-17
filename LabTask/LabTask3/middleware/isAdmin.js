function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    return next();
  }
  res.status(403).send('⛔ Access Denied: Admins only.');
}

module.exports = isAdmin;
