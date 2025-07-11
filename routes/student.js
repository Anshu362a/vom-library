const express = require('express');
const router = express.Router();
const passport = require('passport');
const Student = require('../models/Student');
const { studentRegisterSchema, studentLoginSchema } = require('../validations/student');
const isStudentLoggedIn = require('../middleware/isStudentLoggedIn');
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');

// ✅ Cloudinary Upload Setup
const multer = require('multer');
const { storage } = require('../cloudinary');

// const upload = multer({ storage });
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 }, // ✅ 100 KB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('❌ Only JPEG, PNG, and JPG images are allowed.'));
    }
  }
});


// Reusable middleware for Joi validation
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) throw new ExpressError(400, error.details[0].message);
  next();
};

// GET register form
router.get('/register', (req, res) => {
  res.render('listings/student/register', {
    formData: {},    // ⬅️ define even if empty
    errors: {}       // ⬅️ prevent undefined error
  });
});



// POST register
// router.post('/register', validate(studentRegisterSchema), catchAsync(async (req, res) => {
//   const { name, email, mobile, password } = req.body;
router.post('/register', async (req, res) => {
  const { error } = studentRegisterSchema.validate(req.body, { abortEarly: false });

if (error) {
  const errors = {};
  error.details.forEach((detail) => {
    const field = detail.path[0];
    errors[field] = detail.message;
  });

  return res.render('listings/student/register', {
    formData: req.body,
    errors
  });
}
  // const { error } = studentRegisterSchema.validate(req.body);
  // if (error) {
  //   return res.render('listings/student/register', {
  //     formData: req.body,
  //     validationError: error.details[0].message
  //   });
  // }

  try {
    const { name, email, mobile, password } = req.body;

    // Generate unique studentId (2025XXXX)
    async function generateStudentId() {
      let unique = false;
      let studentId;
      while (!unique) {
        studentId = '2025' + Math.floor(1000 + Math.random() * 9000);
        const exists = await Student.findOne({ studentId });
        if (!exists) unique = true;
      }
      return studentId;
    }

    const studentId = await generateStudentId();
    const student = new Student({ name, email, mobile, studentId });
    const registeredStudent = await Student.register(student, password);

    req.login(registeredStudent, err => {
      if (err) return res.send('❌ Login error after registration.');
      res.redirect('/student/dashboard');
    });

  } catch (err) {
    console.error(err);
    res.render('listings/student/register', {
      formData: req.body,
      validationError: '❌ Registration failed. Try again.'
    });
  }
});

// GET login form
router.get('/login', (req, res) => {
  res.render('listings/student/login');
});

// POST login
router.post('/login', validate(studentLoginSchema), passport.authenticate('student-local', {
  failureRedirect: '/student/login',
  failureFlash: true
}), (req, res) => {
  req.flash('success', '✅ Logged in as Student!');
  res.redirect('/student/dashboard');
});

// GET dashboard (protected)
router.get('/dashboard', isStudentLoggedIn, async (req, res) => {
  const student = req.user;
  res.render('listings/student/dashboard', { student });
});

// Logout
router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      req.flash('error', '❌ Logout failed.');
      return res.redirect('/student/dashboard');
    }
    req.flash('success', '✅ Logged out!');
    res.redirect('/student/login');
  });
});

// Upload profile image
// Upload profile image with size/type error handling
router.post(
  '/upload-profile',
  isStudentLoggedIn,
  (req, res, next) => {
    upload.single('profile')(req, res, async function (err) {
      if (err) {
        // Multer errors (size/type/etc.)
        req.flash('error', err.message || '❌ Upload failed.');
        return res.redirect('/student/dashboard');
      }

      if (!req.file) {
        req.flash('error', '❌ No file selected.');
        return res.redirect('/student/dashboard');
      }

      try {
        const studentId = req.user._id;
        const imageUrl = req.file.path; // Cloudinary URL

        await Student.findByIdAndUpdate(studentId, { profileImage: imageUrl });

        req.flash('success', '✅ Profile image updated!');
        res.redirect('/student/dashboard');
      } catch (e) {
        next(e); // Pass error to global error handler
      }
    });
  }
);

module.exports = router;
