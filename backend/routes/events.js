const express = require("express");
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  addParticipantsToEvent,
} = require("../controllers/eventController");
const { protect, authorize } = require("../middleware/auth");
const activityLogger = require("../middleware/activityLogger");

router.post("/", protect, authorize("admin"), activityLogger, createEvent);
router.get("/", protect, getEvents);
router.get("/:id", protect, getEvent);
router.put("/:id", protect, authorize("admin"), activityLogger, updateEvent);
router.delete("/:id", protect, authorize("admin"), activityLogger, deleteEvent);
router.post(
  "/:id/participants",
  protect,
  authorize("admin"),
  activityLogger,
  addParticipantsToEvent
);

module.exports = router;
