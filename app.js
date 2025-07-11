// npm install multer multer-storage-cloudinary cloudinary
// npm install moment-timezone


if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const ejsLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const ExpressError = require('./utils/ExpressError');

const MongoStore = require('connect-mongo');     //connect mongo 


// Models
const Admin = require('./models/adminRegister');
const Student = require('./models/student');

// Routes
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const enquiryRoutes = require('./routes/enquiry');


// MongoDB Connection
//  const Mongo_Url= mongoose.connect('mongodb://127.0.0.1:27017/vom-library')
const dbUrl = process.env.ATLASDB_URL;


//to connect the database
main().then( ()=>{
    console.log("connected to DB");
}).catch((err) =>{
    console.log(err);
})
async function main() {
    await mongoose.connect(dbUrl);
}

  // .then(() => console.log('✅ Connected to MongoDB'))
  // .catch(err => console.error('❌ MongoDB connection error:', err));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/boilerplate');
app.use(ejsLayouts);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session Setup
const sessionConfig = {
  secret: 'vomSecretKey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};
app.use(session(sessionConfig));
app.use(flash());

// Flash Messages + Locals
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user;
  next();
});

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// passport.use('admin-local', new LocalStrategy(Admin.authenticate()));
passport.use('admin-local', new LocalStrategy(
  { usernameField: 'email' }, // 👈 Tells Passport to use req.body.email
  Admin.authenticate()
));


// passport.use('student-local', new LocalStrategy(Student.authenticate()));
passport.use('student-local', new LocalStrategy(
  { usernameField: 'email' }, // 👈 if your form uses 'email'
  Student.authenticate()
));



passport.serializeUser((user, done) => {
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser(async (data, done) => {
  const model = data.role === 'Admin' ? Admin : Student;
  try {
    const user = await model.findById(data.id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Use Routes
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);
app.use('/enquiry', enquiryRoutes);

// Home Route
app.get('/', (req, res) => {
  res.render('listings/home');
});

// Catch 404 - Not Found
// app.all('*', (req, res, next) => {
//   next(new ExpressError(404, 'Page Not Found'));
// });
// Catch-all 404 handler (safe version)
app.use((req, res) => {
  res.status(404).render('error', {
    err: { statusCode: 404, message: 'Page Not Found' }
  });
});

// Central error handler (for thrown errors)

// Error Handler Middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = 'Something went wrong' } = err;
  res.status(statusCode).render('error', { err });
});


const PORT = 8085;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
