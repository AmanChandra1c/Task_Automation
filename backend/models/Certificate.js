const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  templateImage: {
    type: String,
    required: true,
  },
  templateType: {
    type: String,
    enum: ["sistec", "custom"],
    default: "sistec",
  },
  namePlaceholder: {
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    fontSize: {
      type: Number,
      default: 50,
    },
    fontFamily: {
      type: String,
      default: "Arial",
    },
    color: {
      type: String,
      default: "#000000",
    },
  },
  generatedCertificates: [
    {
      participantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Participant",
      },
      certificateUrl: {
        type: String,
      },
      sentAt: {
        type: Date,
      },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Certificate", CertificateSchema);
