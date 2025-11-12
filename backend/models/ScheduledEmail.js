const mongoose = require("mongoose");

const ScheduledEmailSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "EmailTemplate",
    required: true,
  },
  recipients: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
    },
  ],
  scheduleDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "sent", "failed", "cancelled"],
    default: "pending",
  },
  cronJobId: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sentAt: {
    type: Date,
  },
  errorMessage: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ScheduledEmail", ScheduledEmailSchema);
