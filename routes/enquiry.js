const express = require('express');
const router = express.Router();
const Enquiry = require('../models/enquiry');

// GET - Show enquiry form
router.get('/', (req, res) => {
  res.render('listings/enquiry');
});

// POST - Submit enquiry
router.post('/submit', async (req, res) => {
  const { name, email, mobile, message } = req.body;

  try {
    const newEnquiry = new Enquiry({ name, email, mobile, message });
    await newEnquiry.save();

    req.flash("success", "✅ Enquiry submitted successfully!");
    res.redirect("/enquiry");
  } catch (err) {
    console.error("❌ Error saving enquiry:", err);
    req.flash("error", "❌ Failed to submit enquiry. Please try again.");
    res.redirect("/enquiry");
  }
});

module.exports = router;
