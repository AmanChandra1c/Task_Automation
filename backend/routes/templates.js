const express = require("express");
const router = express.Router();
const {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} = require("../controllers/templateController");
const { protect, authorize } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

router.post("/", protect, authorize("admin"), activityLogger, createTemplate);
router.get("/", protect, getTemplates);
router.get("/:id", protect, getTemplate);
router.put("/:id", protect, authorize("admin"), activityLogger, updateTemplate);
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  activityLogger,
  deleteTemplate
);

module.exports = router;
