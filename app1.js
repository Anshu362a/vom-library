// npm install multer multer-storage-cloudinary cloudinary
// npm install moment-timezone
// npm install express-mongo-sanitize
// npm install express-useragent
// npm install helmet xss-clean express-rate-limit csurf

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // only trust first proxy (like Railway or Heroku)
} else {
  app.set('trust proxy', false); // don't trust proxy headers in dev
}

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
const moment = require('moment-timezone');
const mongoSanitize = require('express-mongo-sanitize');
const ExpressError = require('./utils/ExpressError');
const MongoStore = require('connect-mongo');
const useragent = require('express-useragent');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');

// Models
const Admin = require('./models/adminRegister');
const Student = require('./models/student');

// Routes
const adminRoutes = require('./routes/admin');
const studentRoutes = require('./routes/student');
const enquiryRoutes = require('./routes/enquiry');

const dbUrl = process.env.ATLASDB_URL;

main().then(() => {
  console.log("connected to DB");
}).catch((err) => {
  console.log(err);
});
async function main() {
  await mongoose.connect(dbUrl);
}

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/boilerplate');
app.use(ejsLayouts);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});

const istTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD hh:mm A");
console.log("India Time:", istTime);

// Security Middlewares
app.use(helmet());
// app.use(mongoSanitize());

// Safe sanitization without overwriting req.query
app.use((req, res, next) => {
  try {
    if (req.body) req.body = JSON.parse(JSON.stringify(req.body));
    if (Object.keys(req.query || {}).length) {
      req.cleanedQuery = JSON.parse(JSON.stringify(req.query));
    } else {
      req.cleanedQuery = {};
    }
    if (req.params) req.params = JSON.parse(JSON.stringify(req.params));
  } catch (err) {
    return next(new ExpressError(400, 'Bad Request: Input sanitation failed'));
  }
  next();
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true, // send rate limit info in headers
  legacyHeaders: false,  // disable deprecated X-RateLimit-* headers
});
app.use(limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/admin/login', loginLimiter);
app.use('/student/login', loginLimiter);

// Session Setup
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'vomSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
};
app.use(session(sessionConfig));
app.use(flash());

// Apply CSRF protection after session setup
const csrfProtection = csrf();
app.use(csrfProtection);

app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken();
  } catch (err) {
    return next(new ExpressError(403, 'Invalid CSRF token'));
  }
  next();
});

// Device Logging Middleware
app.use(useragent.express());
app.use(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress;
  const geo = geoip.lookup(ip);
  const location = geo ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}` : 'Unknown Location';
  const platform = req.useragent.platform || 'Unknown Platform';
  const browser = req.useragent.browser || 'Unknown Browser';
  const deviceType = req.useragent.isMobile ? 'Mobile' : 'Desktop';
  const device = `${platform} - ${browser} (${deviceType})`;
  const today = moment().tz("Asia/Kolkata").startOf('day');
  const now = moment().tz("Asia/Kolkata").toDate();
  const alreadyLogged = await Visit.findOne({ ip, device, visitedAt: { $gte: today.toDate() } });
  if (!alreadyLogged) {
    await Visit.create({ ip, location, device, visitedAt: now });
    console.log("✅ New Visit Logged:", { ip, device, location });
  }
  next();
});

app.use((req, res, next) => {
  res.locals.success = req.flash('success') || [];
  res.locals.error = req.flash('error') || [];
  res.locals.currentUser = req.user || null;
  next();
});

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use('admin-local', new LocalStrategy({ usernameField: 'email' }, Admin.authenticate()));
passport.use('student-local', new LocalStrategy({ usernameField: 'email' }, Student.authenticate()));

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

// 404 Error
app.use((req, res) => {
  res.status(404).render('error', {
    err: { statusCode: 404, message: 'Page Not Found' }
  });
});

// Error Handler Middleware
app.use((err, req, res, next) => {
  const { statusCode = 500, message = 'Something went wrong' } = err;
  res.status(statusCode).render('error', { err });
});

const PORT = process.env.PORT || 8085;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});