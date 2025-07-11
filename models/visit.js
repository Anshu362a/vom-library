// models/Visit.js
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  count: {
    type: Number,
    default: 0
  },
  ip: String,
  location: String,
  visitedAt: {
    type: Date,
    default: Date.now
  }
});

// module.exports = mongoose.model('Visit', visitSchema);

// Prevent OverwriteModelError
module.exports = mongoose.models.Visit || mongoose.model('Visit', visitSchema);




// const mongoose = require('mongoose');

// const visitSchema = new mongoose.Schema({
//   count: {
//     type: Number,
//     default: 0,
//   },
// });

// module.exports = mongoose.model('Visit', visitSchema);
