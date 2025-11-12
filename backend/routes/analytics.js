const express = require("express");
const router = express.Router();
const {
  exportEmailsReport,
  exportCertificatesReport,
  exportEventSummary,
} = require("../controllers/analyticsController");
const { protect, authorize } = require("../middleware/auth");

router.get("/export/emails", protect, authorize("admin"), exportEmailsReport);
router.get(
  "/export/certificates",
  protect,
  authorize("admin"),
  exportCertificatesReport
);
router.get(
  "/export/event/:id",
  protect,
  authorize("admin"),
  exportEventSummary
);

module.exports = router;
