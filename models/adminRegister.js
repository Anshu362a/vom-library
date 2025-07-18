const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    default: "Admin"
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

adminSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
