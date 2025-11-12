const mongoose = require("mongoose");

const ParticipantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  semester: {
    type: String,
    default: "",
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    default: null,
  },
  customFields: {
    type: Map,
    of: String,
    default: {},
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  certificateSent: {
    type: Boolean,
    default: false,
  },
  emailSentAt: {
    type: Date,
  },
  certificateSentAt: {
    type: Date,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Participant", ParticipantSchema);
