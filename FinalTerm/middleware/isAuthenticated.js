function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.session.message = 'Please login to access this page.';
  res.redirect('/login');
}

module.exports = isAuthenticated;
