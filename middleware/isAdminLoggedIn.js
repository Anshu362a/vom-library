module.exports = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role !== 'Student') return next();
  req.flash("error", "Admin login required.");
  res.redirect("/admin/login");
};
