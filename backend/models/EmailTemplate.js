const mongoose = require("mongoose");

const EmailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a template name"],
    trim: true,
  },
  subject: {
    type: String,
    required: [true, "Please add an email subject"],
    trim: true,
  },
  body: {
    type: String,
    required: [true, "Please add email body content"],
  },
  placeholders: [
    {
      type: String,
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
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("EmailTemplate", EmailTemplateSchema);
