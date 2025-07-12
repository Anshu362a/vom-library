// npm install multer multer-storage-cloudinary cloudinary
// npm install moment-timezone
// npm install express-mongo-sanitize
//npm install express-mongo-sanitize@2
//npm install express-useragent




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
const moment = require('moment-timezone');

// const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
const mongoSanitize = require('express-mongo-sanitize'); // it prevents the Nosql injection
const ExpressError = require('./utils/ExpressError');

const MongoStore = require('connect-mongo');     //connect mongo 
const useragent = require('express-useragent');//for device info

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

// mongoose.set('strictQuery', true);
// app.use(mongoSanitize());





app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});


const istTime = moment().tz("Asia/Kolkata").format("YYYY-MM-DD hh:mm A");
console.log("India Time:", istTime); // e.g., "2025-07-12 08:31 AM"


// --------------ip and others------//

// app.set('trust proxy', true); // Required when behind a proxy like Render

// app.use(async (req, res, next) => {
//   const ip =
//     req.headers['x-forwarded-for']?.split(',')[0].trim() ||
//     req.ip ||
//     req.socket.remoteAddress;

//   const geo = geoip.lookup(ip);
//   const location = geo
//     ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}`
//     : 'Unknown Location';

//   const time = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

//   // ❌ Don't log the same IP multiple times in a day
//   const today = moment().startOf('day');
//   const existingVisit = await Visit.findOne({
//     ip,
//     visitedAt: { $gte: today.toDate() }
//   });

//   if (!existingVisit) {
//     await Visit.create({ ip, location, visitedAt: new Date(time) });
//     console.log("✅ New unique visit recorded");
//   } else {
//     console.log("ℹ️ IP already visited today");
//   }

//   next();
// });


// app.set('trust proxy', true); // This is required to let Express trust x-forwarded-for




app.set('trust proxy', true); // Trust x-forwarded-for (for Render/Heroku)

app.use(useragent.express()); // Parse device info

app.use(async (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress;
  const geo = geoip.lookup(ip);
  const location = geo
    ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}`
    : 'Unknown Location';

  const platform = req.useragent.platform || 'Unknown Platform';
  const browser = req.useragent.browser || 'Unknown Browser';
  const deviceType = req.useragent.isMobile ? 'Mobile' : 'Desktop';
  const device = `${platform} - ${browser} (${deviceType})`;

  const today = moment().tz("Asia/Kolkata").startOf('day');
  const now = moment().tz("Asia/Kolkata").toDate();

  const alreadyLogged = await Visit.findOne({
    ip,
    device,
    visitedAt: { $gte: today.toDate() }
  });

  // if (!alreadyLogged) {
  //   await Visit.create({ ip, location, device, visitedAt: now });
  //   console.log("✅ New Visit Logged:", { ip, device, location });
  // } else {
  //   // console.log("ℹ️ Already logged today for", ip, device);
  // }

  next();
});



// app.set('trust proxy', true); // Required for Render/Heroku
// app.use(useragent.express()); // Must be before visit logging

// app.use(async (req, res, next) => {
//   const ip =
//     req.headers['x-forwarded-for']?.split(',')[0].trim() ||
//     req.ip ||
//     req.socket.remoteAddress;

//   const geo = geoip.lookup(ip);

//   const location = geo
//     ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}`
//     : 'Unknown Location';

//   const time = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");

//   // ✅ Construct device info
//   const platform = req.useragent.platform || 'Unknown Platform';
//   const browser = req.useragent.browser || 'Unknown Browser';
//   const deviceType = req.useragent.isMobile ? 'Mobile' : 'Desktop';

//   const device = `${platform} - ${browser} (${deviceType})`;

//   // ✅ Avoid duplicate logs for same IP per day
//   const today = moment().startOf('day');
//   const existing = await Visit.findOne({
//     ip,
//     visitedAt: { $gte: today.toDate() }
//   });

//   if (!existing) {
//     await Visit.create({ ip, location, device, visitedAt: new Date(time) });
//     console.log("✅ Logged:", { ip, location, device });
//   } else {
//     console.log("ℹ️ Already logged today");
//   }

//   next();
// });



// app.set('trust proxy', true); // Required on Render/Heroku
// app.use(useragent.express()); // ✅  // Middleware to get device info
// app.use(async (req, res, next) => {
//   // Prefer real IP from proxy headers
//   const ip =
//     req.headers['x-forwarded-for']?.split(',')[0].trim() ||
//     req.ip ||
//     req.socket.remoteAddress;

//   const geo = geoip.lookup(ip);

//   const location = geo
//     ? `${geo.city || 'Unknown City'}, ${geo.region || 'Unknown Region'}, ${geo.country || 'Unknown Country'}`
//     : 'Unknown Location';

//   const time = moment().tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
//   const device = `${req.useragent.platform} - ${req.useragent.browser} (${req.useragent.isMobile ? 'Mobile' : 'Desktop'})`;

//   console.log(`📍 Visitor IP: ${ip}`);
//   console.log(`📍 Geo Location: ${location}`);
//   console.log(`📱 Device Info: ${device}`);
//   console.log("📱 UserAgent Info:", req.useragent);


//   await Visit.create({ 
//     ip, 
//     location,
//     device, 
//     visitedAt: new Date(time) });

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
// app.use((req, res, next) => {
//   res.locals.success = req.flash('success');
//   res.locals.error = req.flash('error');
//   res.locals.currentUser = req.user;
//   next();
// });

app.use((req, res, next) => {
  res.locals.success = req.flash('success') || [];
  res.locals.error = req.flash('error') || [];
  res.locals.currentUser = req.user || null;
  next();
});

// app.use(mongoSanitize({ replaceWith: '_' }));


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


app.use((req, res, next) => {
  Object.defineProperty(req, 'query', {
    set() {
      console.error('❌ Someone tried to overwrite req.query here!');
    },
  });
  next();
});


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


const PORT = process.env.PORT || 8085;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
