const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  createCertificate,
  getCertificates,
  getCertificate,
  generateCertificate,
  generateBulkCertificates,
  updateCertificate,
  deleteCertificate,
  getDefaultTemplate,
  createFromDefaultTemplate,
  previewCertificate,
  updateTemplateType,
} = require("../controllers/certificateController");
const { protect, authorize } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

// Configure multer for certificate template uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/certificate-templates/");
  },
  filename: function (req, file, cb) {
    cb(null, "template-" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image and PDF files are allowed"));
    }
  },
});

// Create uploads directory if it doesn't exist
const fs = require("fs");
const uploadDir = path.join(__dirname, "../uploads/certificate-templates");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.post(
  "/",
  protect,
  authorize("admin"),
  activityLogger,
  upload.single("template"),
  createCertificate
);
router.post(
  "/default",
  protect,
  authorize("admin"),
  activityLogger,
  createFromDefaultTemplate
);
router.get("/", protect, getCertificates);
router.get(
  "/default-template",
  protect,
  authorize("admin"),
  getDefaultTemplate
);
// Preview route must come before /:id route to avoid route conflicts
router.get("/:id/preview", protect, authorize("admin"), previewCertificate);
router.put(
  "/:id/template",
  protect,
  authorize("admin"),
  activityLogger,
  updateTemplateType
);
router.get("/:id", protect, getCertificate);
router.put(
  "/:id",
  protect,
  authorize("admin"),
  activityLogger,
  updateCertificate
);
router.post(
  "/:id/generate",
  protect,
  authorize("admin"),
  activityLogger,
  generateCertificate
);
router.post(
  "/:id/generate-bulk",
  protect,
  authorize("admin"),
  activityLogger,
  generateBulkCertificates
);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  activityLogger,
  deleteCertificate
);

module.exports = router;
