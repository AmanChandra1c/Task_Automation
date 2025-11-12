const express = require("express");
const router = express.Router();
const {
  sendEmail,
  sendBulkEmails,
  scheduleEmail,
  getScheduledEmails,
  cancelScheduledEmail,
} = require("../controllers/emailController");
const { protect, authorize } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

router.post("/send", protect, authorize("admin"), activityLogger, sendEmail);
router.post(
  "/send-bulk",
  protect,
  authorize("admin"),
  activityLogger,
  sendBulkEmails
);
router.post(
  "/schedule",
  protect,
  authorize("admin"),
  activityLogger,
  scheduleEmail
);
router.get("/scheduled", protect, getScheduledEmails);
router.delete(
  "/scheduled/:id",
  protect,
  authorize("admin"),
  activityLogger,
  cancelScheduledEmail
);

module.exports = router;
