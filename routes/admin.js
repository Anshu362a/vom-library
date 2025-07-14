const express = require("express");
const router = express.Router();
const passport = require("passport");
const Admin = require("../models/adminRegister");
const {
  adminRegisterSchema,
  adminLoginSchema,
} = require("../validations/admin");
const isAdminLoggedIn = require("../middleware/isAdminLoggedIn");
const catchAsync = require("../utils/catchAsync");
const ExpressError = require("../utils/ExpressError");
const Student = require("../models/student");
const Enquiry = require("../models/enquiry");
const Visit = require("../models/visit");

const moment = require("moment-timezone");

// Validate middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  // if (error) throw new ExpressError(400, error.details[0].message);
  if (error) {
    const errors = {};
    error.details.forEach((err) => {
      const field = err.context.key;
      errors[field] = err.message;
    });

    return res.status(400).render("listings/admin/adminRegister", {
      formData: req.body,
      errors,
    });
  }

  next();
};

router.get("/register", async (req, res) => {
  const adminCount = await Admin.countDocuments();
  if (adminCount > 0) return res.redirect("/admin/login");

  res.render("listings/admin/adminRegister", {
    formData: {}, // ✅ Must be defined even if empty
    errors: {}, // ✅ Prevent "errors is not defined"
  });
});

// -------------post---------//
router.post("/register", async (req, res) => {
  const { error } = adminRegisterSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errors = {};
    error.details.forEach((err) => {
      const field = err.context.key;
      errors[field] = err.message;
    });

    return res.status(400).render("listings/admin/adminRegister", {
      formData: req.body,
      errors,
    });
  }

  try {
    const { email, password } = req.body;

    const registeredAdmin = await Admin.register(
      new Admin({ email }),
      password
    );
    req.login(registeredAdmin, (err) => {
      if (err) return res.send("Login failed.");
      res.redirect("/admin/dashboard");
    });
  } catch (err) {
    console.error("❌ Admin registration error:", err);
    res.render("listings/admin/adminRegister", {
      formData: req.body,
      errors: {
        general: "❌ Registration failed. Maybe email is already used.",
      },
    });
  }
});

// -------------post---------//

router.get("/login", (req, res) => {
  res.render("listings/admin/login");
});

router.post(
  "/login",
  validate(adminLoginSchema),
  passport.authenticate("admin-local", {
    failureRedirect: "/admin/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "✅ Logged in successfully!");
    res.redirect("/admin/dashboard");
  }
);

router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      req.flash("error", "Logout failed.");
      return res.redirect("/admin/dashboard");
    }
    req.flash("success", "✅ Logged out!");
    res.redirect("/admin/login");
  });
});

router.get("/dashboard", isAdminLoggedIn, (req, res) => {
  res.render("listings/admin/admindashboard");
});

//  to view student in admin dashboard with passport
router.get("/students", isAdminLoggedIn, async (req, res) => {
  const students = await Student.find();
  res.render("listings/admin/viewStudents", { students });
});
// to generate id card
router.get("/students/:id/idcard", isAdminLoggedIn, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.send("❌ Student not found.");
  res.render("listings/admin/studentId", { student });
});

// -------mark attendence start----------//

router.get("/mark-attendance", isAdminLoggedIn, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const studentsIn = await Student.find({
    attendance: {
      $elemMatch: {
        date: { $gte: new Date(today) },
        exitTime: null,
        status: "IN",
      },
    },
  });

  res.render("listings/admin/markAttendance", {
    student: null,
    error: null,
    markedAs: null,
    entryTime: null,
    exitTime: null,
    studentsIn,
  });
});

router.post("/mark-attendance", isAdminLoggedIn, async (req, res) => {
  const { studentId } = req.body;

  try {
    const student = await Student.findOne({ studentId });

    if (!student) {
      const formattedExit = todayRecord.exitTime
        ? moment(todayRecord.exitTime).tz("Asia/Kolkata").format("hh:mm:ss A")
        : "—";
      return res.render("listings/admin/markAttendance", {
        student: null,
        error: "❌ Student ID not found!",
        markedAs: null,
        entryTime: null,
        exitTime: formattedExit,
        // exitTime: null,
        studentsIn: [],
      });
    }

    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    let todayRecord = student.attendance.find((att) =>
      isSameDay(new Date(att.entryTime), new Date())
    );

    let markedAs, entryTime, exitTime;

    if (!todayRecord) {
      const now = new Date();
      const entry = {
        date: now,
        entryTime: now,
        status: "IN",
      };
      student.attendance.push(entry);
      entryTime = moment(entry.entryTime)
        .tz("Asia/Kolkata")
        .format("hh:mm:ss A");
      markedAs = "entry";
    } else if (!todayRecord.exitTime) {
      todayRecord.exitTime = new Date();
      todayRecord.status = "OUT";
      await student.save(); // ✅ Save first
      exitTime = moment(todayRecord.exitTime)
        .tz("Asia/Kolkata")
        .format("hh:mm:ss A");
      markedAs = "exit";
    } else {
      const formattedExit = todayRecord.exitTime
        ? moment(todayRecord.exitTime).tz("Asia/Kolkata").format("hh:mm:ss A")
        : "—";
      return res.render("listings/admin/markAttendance", {
        student,
        error: `✅ Attendance already marked for today!`,
        // error: '✅ Attendance already marked for today!',
        markedAs: null,
        entryTime: null,
        exitTime: formattedExit,
        studentsIn: [],
      });
    }

    await student.save();

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const studentsIn = await Student.find({
      attendance: {
        $elemMatch: {
          entryTime: { $gte: startOfDay, $lte: endOfDay },
          exitTime: null,
          status: "IN",
        },
      },
    });

    res.render("listings/admin/markAttendance", {
      student,
      error: null,
      markedAs,
      entryTime,
      exitTime,
      studentsIn,
    });
  } catch (err) {
    console.error("Error marking attendance:", err);
    res.render("listings/admin/markAttendance", {
      student: null,
      error: "❌ Student ID not found!",
      markedAs: null,
      entryTime: null,
      exitTime: "—",
      studentsIn: [],
    });
  }
});
// -------mark attendence end----------//

// Today attendance

router.get("/today-attendance", isAdminLoggedIn, async (req, res) => {
  try {
    const allStudents = await Student.find({});
    const today = new Date().toDateString();

    const present = [];
    const absent = [];

    allStudents.forEach((student) => {
      const todayRecord = student.attendance.find(
        (a) => new Date(a.entryTime).toDateString() === today
      );

      if (todayRecord) {
        const entryTimeFormatted = moment(todayRecord.entryTime)
          .tz("Asia/Kolkata")
          .format("hh:mm:ss A");
        const exitTimeFormatted = todayRecord.exitTime
          ? moment(todayRecord.exitTime).tz("Asia/Kolkata").format("hh:mm:ss A")
          : "—";

        // Duration in hrs/mins
        let duration = "—";
        if (todayRecord.entryTime && todayRecord.exitTime) {
          const diff =
            new Date(todayRecord.exitTime) - new Date(todayRecord.entryTime);
          const hrs = Math.floor(diff / 1000 / 60 / 60);
          const mins = Math.floor((diff / 1000 / 60) % 60);
          duration = `${hrs}h ${mins}m`;
        }

        present.push({
          ...student.toObject(),
          entryTimeFormatted,
          exitTimeFormatted,
          status: todayRecord.status,
          duration,
        });
      } else {
        absent.push(student);
      }
    });

    res.render("listings/admin/todayAttendance", {
      students: present,
      totalPresent: present.length,
      totalAbsent: absent.length,
      absentStudents: absent,
    });
  } catch (err) {
    console.error("Error fetching today attendance:", err);
    res.send("Something went wrong.");
  }
});

//-----Today Attendance end------//
// Check dues
router.get("/check-dues", isAdminLoggedIn, async (req, res) => {
  try {
    const students = await Student.find().sort({ membershipExpiry: 1 });
    res.render("listings/admin/checkDues", { students });
  } catch (err) {
    res.status(500).send("❌ Error fetching students: " + err.message);
  }
});

// Update membership
router.post("/update-membership/:id", isAdminLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { months } = req.body;

  try {
    const student = await Student.findById(id);
    const now = new Date();
    const currentExpiry = new Date(student.membershipExpiry);
    const baseDate = currentExpiry > now ? currentExpiry : now;

    baseDate.setMonth(baseDate.getMonth() + parseInt(months));
    student.membershipExpiry = baseDate;

    await student.save();
    req.flash("success", "✅ Membership updated!");
    res.redirect("/admin/check-dues");
  } catch (err) {
    res.send("❌ Update failed: " + err.message);
  }
});

// Show membership edit form
router.get("/edit-expiry/:id", async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.send("❌ Student not found");
  res.render("listings/admin/editExpiry", { student });
});

router.post("/edit-expiry/:id", async (req, res) => {
  const { id } = req.params;
  const { newExpiry } = req.body;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.send("❌ Student not found.");
    }

    student.membershipExpiry = newExpiry;
    await student.save({ validateBeforeSave: false });
    res.redirect("/admin/check-dues");
  } catch (err) {
    res.send("❌ Failed to update expiry: " + err.message);
  }
});

// View enquiries
router.get("/enquiries", isAdminLoggedIn, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ submittedAt: -1 });
    res.render("listings/admin/viewEnquiries", { enquiries });
  } catch (err) {
    res.status(500).send("❌ Failed to load enquiries: " + err.message);
  }
});

// Mark enquiry as solved
router.post("/enquiries/:id/solve", isAdminLoggedIn, async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      req.flash("error", "❌ Enquiry not found");
      return res.redirect("/admin/enquiries");
    }

    enquiry.isSolved = true;
    enquiry.solvedAt = new Date(); // ✅ Save solved time
    await enquiry.save();

    req.flash("success", "✅ Enquiry marked as solved");
    res.redirect("/admin/enquiries");
  } catch (err) {
    console.error("Error updating enquiry:", err);
    req.flash("error", "❌ Failed to update enquiry");
    res.redirect("/admin/enquiries");
  }
});

// Today attendance
router.get("/today-attendance", isAdminLoggedIn, async (req, res) => {
  try {
    const allStudents = await Student.find({});
    const today = new Date().toDateString();

    const present = [];
    const absent = [];

    allStudents.forEach((student) => {
      const todayRecord = student.attendance.find(
        (a) => new Date(a.entryTime).toDateString() === today
      );

      if (todayRecord) {
        present.push(student);
      } else {
        absent.push(student);
      }
    });

    res.render("listings/admin/todayAttendance", {
      students: present,
      totalPresent: present.length,
      totalAbsent: absent.length,
      absentStudents: absent,
    });
  } catch (err) {
    console.error("Error fetching today attendance:", err);
    res.send("Something went wrong.");
  }
});

// Check dues
router.get("/check-dues", isAdminLoggedIn, async (req, res) => {
  try {
    const students = await Student.find().sort({ membershipExpiry: 1 });
    res.render("listings/admin/checkDues", { students });
  } catch (err) {
    res.status(500).send("❌ Error fetching students: " + err.message);
  }
});

// Update membership
router.post("/update-membership/:id", isAdminLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { months } = req.body;

  try {
    const student = await Student.findById(id);
    const now = new Date();
    const currentExpiry = new Date(student.membershipExpiry);
    const baseDate = currentExpiry > now ? currentExpiry : now;

    baseDate.setMonth(baseDate.getMonth() + parseInt(months));
    student.membershipExpiry = baseDate;

    await student.save();
    req.flash("success", "✅ Membership updated!");
    res.redirect("/admin/check-dues");
  } catch (err) {
    res.send("❌ Update failed: " + err.message);
  }
});

// Show membership edit form
router.get("/edit-expiry/:id", async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.send("❌ Student not found");
  res.render("listings/admin/editExpiry", { student });
});

router.post("/edit-expiry/:id", async (req, res) => {
  const { id } = req.params;
  const { newExpiry } = req.body;

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.send("❌ Student not found.");
    }

    student.membershipExpiry = newExpiry;
    await student.save({ validateBeforeSave: false });
    res.redirect("/admin/check-dues");
  } catch (err) {
    res.send("❌ Failed to update expiry: " + err.message);
  }
});

// View enquiries
router.get("/enquiries", isAdminLoggedIn, async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ submittedAt: -1 });
    res.render("listings/admin/viewEnquiries", { enquiries });
  } catch (err) {
    res.status(500).send("❌ Failed to load enquiries: " + err.message);
  }
});

//--------attendence report csv file start--------//
router.get(
  "/today-attendance/export-csv",
  isAdminLoggedIn,
  async (req, res) => {
    const allStudents = await Student.find({});
    const today = new Date().toDateString();
    const records = [];

    allStudents.forEach((student) => {
      const todayRecord = student.attendance.find(
        (a) => new Date(a.entryTime).toDateString() === today
      );
      if (todayRecord) {
        const entry = new Date(todayRecord.entryTime);
        const exit = todayRecord.exitTime
          ? new Date(todayRecord.exitTime)
          : null;
        let duration = "";

        if (entry && exit) {
          const diff = exit - entry;
          const hrs = Math.floor(diff / 1000 / 60 / 60);
          const mins = Math.floor((diff / 1000 / 60) % 60);
          duration = `${hrs}h ${mins}m`;
        }

        records.push({
          Name: student.name,
          ID: student.studentId,
          Entry: moment(entry).tz("Asia/Kolkata").format("hh:mm:ss A"),
          Exit: exit
            ? moment(exit).tz("Asia/Kolkata").format("hh:mm:ss A")
            : "—",
          Status: todayRecord.status,
          Duration: duration || "—",
        });
      }
    });

    const json2csv = new Parser();
    const csv = json2csv.parse(records);

    res.header("Content-Type", "text/csv");
    res.attachment("today_attendance.csv");
    return res.send(csv);
  }
);

//--------attendence report csv file end--------//

//--------attendence report pdf file start--------//
router.get(
  "/today-attendance/export-pdf",
  isAdminLoggedIn,
  async (req, res) => {
    const allStudents = await Student.find({});
    const today = new Date().toDateString();

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=today_attendance.pdf"
    );
    doc.pipe(res);

    doc
      .fontSize(18)
      .text(`📆 VOM Library - Today's Attendance`, { align: "center" });
    doc.moveDown();
    doc.fontSize(12);

    allStudents.forEach((student, idx) => {
      const record = student.attendance.find(
        (a) => new Date(a.entryTime).toDateString() === today
      );

      if (record) {
        const entry = moment(record.entryTime)
          .tz("Asia/Kolkata")
          .format("hh:mm:ss A");
        const exit = record.exitTime
          ? moment(record.exitTime).tz("Asia/Kolkata").format("hh:mm:ss A")
          : "—";

        let duration = "—";

        if (record.entryTime && record.exitTime) {
          const diff = new Date(record.exitTime) - new Date(record.entryTime);
          const hrs = Math.floor(diff / 1000 / 60 / 60);
          const mins = Math.floor((diff / 1000 / 60) % 60);
          duration = `${hrs}h ${mins}m`;
        }

        doc.text(`${idx + 1}. ${student.name} (ID: ${student.studentId})`);
        doc.text(
          `   Entry: ${entry}  Exit: ${exit}  Status: ${record.status}  Duration: ${duration}`
        );
        doc.moveDown();
      }
    });

    doc.end();
  }
);

//--------attendence report pdf file end--------//

//---------monthlyAttendance start-----------//

router.get("/monthly-attendance", isAdminLoggedIn, async (req, res) => {
  const { month, search } = req.query;
  const selectedDate = month ? new Date(month) : new Date();

  const year = selectedDate.getFullYear();
  const monthNum = selectedDate.getMonth(); // 0-indexed

  const today = new Date();
  const todayDate =
    today.getMonth() === monthNum && today.getFullYear() === year
      ? today.getDate()
      : new Date(year, monthNum + 1, 0).getDate(); // limit to current day or month's last date

  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
      ],
    };
  }

  const students = await Student.find(query).lean();

  students.forEach((student) => {
    const monthlyRecords = [];
    let totalDaysPresent = 0;

    // 1. Find first attendance date in the selected month
    const firstAttendanceInMonth = student.attendance?.find((a) => {
      const d = new Date(a.entryTime);
      return d.getFullYear() === year && d.getMonth() === monthNum;
    });

    if (firstAttendanceInMonth) {
      const joinDay = new Date(firstAttendanceInMonth.entryTime).getDate();

      for (let day = joinDay; day <= todayDate; day++) {
        const currentDate = new Date(year, monthNum, day);
        const dayStr = currentDate.toDateString();

        const record = student.attendance?.find(
          (a) => new Date(a.entryTime).toDateString() === dayStr
        );

        if (record) {
          totalDaysPresent++;
          const entry = new Date(record.entryTime).toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
          });
          const exit = record.exitTime
            ? new Date(record.exitTime).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : "—";
          let duration = "—";

          if (record.entryTime && record.exitTime) {
            const diff = new Date(record.exitTime) - new Date(record.entryTime);
            const hrs = Math.floor(diff / 1000 / 60 / 60);
            const mins = Math.floor((diff / 1000 / 60) % 60);
            duration = `${hrs}h ${mins}m`;
          }

          monthlyRecords.push({
            date: dayStr,
            entry,
            exit,
            status: record.status,
            duration,
          });
        } else {
          // Mark absent day after joining and before today
          monthlyRecords.push({
            date: dayStr,
            entry: "—",
            exit: "—",
            status: "Absent",
            duration: "—",
          });
        }
      }

      student.totalDaysInMonth = todayDate - joinDay + 1;
      student.totalDaysPresent = totalDaysPresent;
      student.monthlyRecords = monthlyRecords;
    } else {
      student.totalDaysInMonth = 0;
      student.totalDaysPresent = 0;
      student.monthlyRecords = [];
    }
  });

  res.render("listings/admin/monthlyAttendance", {
    students,
    month: monthNum + 1,
    year,
    monthName: selectedDate.toLocaleString("default", { month: "long" }),
    search,
  });
});

//---------monthlyAttendance end-----------//

// -----------visitors-------//
// In routes/admin.js

router.get("/visitors", isAdminLoggedIn, async (req, res) => {
  const visits = await Visit.find().sort({ visitedAt: -1 });
  res.render("listings/admin/visitors", { visits });
});

// -----------visitors-------//

module.exports = router;
