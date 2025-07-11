const mongoose = require('mongoose');
const attendanceSchema = require('./attendance');
const passportLocalMongoose = require('passport-local-mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  mobile: {
    type: String,
    required: true,
    match: /^0?[6-9]\d{9}$/,
    trim: true
  },

  profileImage: {
  type: String,
  default: '/images/default-user.png'
},
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  membershipExpiry: {
    type: Date,
    default: () => {
      const now = new Date();
      now.setMonth(now.getMonth() + 1);
      return now;
    }
  },
  attendance: [attendanceSchema]

}, {
  timestamps: true
});

// Enable passport-local-mongoose using email as username
studentSchema.plugin(passportLocalMongoose, {
  usernameField: 'email'
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;

