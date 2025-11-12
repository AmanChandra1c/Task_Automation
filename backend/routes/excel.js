const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  uploadExcel,
  getParticipants,
  getParticipant,
} = require("../controllers/excelController");

const { protect, authorize } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

const uploadDir = path.join(__dirname, "../uploads/excel");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Created upload directory:", uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // ✅ use absolute path
  },
  filename: function (req, file, cb) {
    const uniqueName =
      file.fieldname + "-" + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = [".xlsx", ".xls", ".csv"];
    const allowedMime = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];

    if (allowedExt.includes(ext) && allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel (.xls, .xlsx) and CSV files are allowed"));
    }
  },
});

router.post(
  "/upload",
  protect,
  authorize("admin"),
  activityLogger,
  upload.single("file"), // ✅ ensure frontend uses formData.append("file", selectedFile)
  (req, res, next) => {
    console.log("📁 Uploaded file:", req.file?.originalname);
    next();
  },
  uploadExcel
);

// Get all participants
router.get("/participants", protect, getParticipants);

// Get single participant
router.get("/participants/:id", protect, getParticipant);

module.exports = router;
