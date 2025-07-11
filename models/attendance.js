// models/attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  entryTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  exitTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true
  }
});

module.exports = attendanceSchema;
