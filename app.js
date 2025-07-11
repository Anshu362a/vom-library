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
const Visit = require('./models/visit');
const geoip = require('geoip-lite');
// const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

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


// --------------ip and others------//

app.use(async (req, res, next) => {
  const rawIp =
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  const ip = rawIp.split(',')[0].trim(); // Handles proxies/multiple IPs

  const geo = geoip.lookup(ip);

  const location = geo
    ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}`
    : 'Unknown Location';

  await Visit.create({ count: 1, ip, location });

  next();
});



// app.use(async (req, res, next) => {
//   // Get visitor IP
//   const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

//   // Get location from IP
//   const geo = geoip.lookup(ip);
//   const location = geo
//     ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}`
//     : 'Unknown Location';

//   // Save each visit with IP & location
//   await Visit.create({ count: 1, ip, location });

//   next();
// });
// --------------ip and others------//


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
// app.get('/', (req, res) => {
//   res.render('listings/home');
// });

// Home Route with Visitor Count

app.get('/', async (req, res) => {
  const visit = await Visit.findOne();
  const count = visit ? visit.count : 0;
  res.render('listings/home', { visitCount: count });
});

// Middleware to count visits
app.use(async (req, res, next) => {
  let visit = await Visit.findOne();
  if (!visit) {
    visit = new Visit({ count: 1 });
  } else {
    visit.count += 1;
  }
  await visit.save();
  next();
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
