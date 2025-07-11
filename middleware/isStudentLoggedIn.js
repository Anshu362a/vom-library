module.exports = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role !== 'Admin') return next();
  req.flash("error", "Student login required.");
  res.redirect("/student/login");
};
