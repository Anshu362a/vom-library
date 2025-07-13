// models/Visit.js
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  ip: String,
  location: String,
  device: String,
  visitedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Visit || mongoose.model('Visit', visitSchema);

