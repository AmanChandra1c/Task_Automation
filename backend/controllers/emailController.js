const EmailTemplate = require("../models/EmailTemplate");
const ScheduledEmail = require("../models/ScheduledEmail");
const Participant = require("../models/Participant");
const emailService = require("../utils/emailService");
const scheduler = require("../utils/scheduler");
const ActivityLog = require("../models/ActivityLog");
const Event = require("../models/Event");

// @desc    Send email to single participant
// @route   POST /api/emails/send
// @access  Private/Admin
exports.sendEmail = async (req, res) => {
  try {
    const { participantId, templateId } = req.body;

    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Get event name if participant has event
    let eventName = "";
    const participant = await Participant.findById(participantId);
    if (participant && participant.eventId) {
      const event = await Event.findById(participant.eventId);
      if (event) {
        eventName = event.name;
      }
    }

    const result = await emailService.sendEmail(
      participantId,
      template,
      eventName
    );

    if (result.success) {
      // Emit socket notification
      const io = req.app.get("io");
      if (io) {
        io.emit("emailSent", {
          message: "Email sent successfully",
          participantId,
          userId: req.user._id,
        });
      }

      // Log activity
      await ActivityLog.create({
        userId: req.user._id,
        action: "Email sent",
        details: { participantId, templateId },
        status: 200,
      });

      res.status(200).json({
        success: true,
        message: "Email sent successfully",
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send bulk emails
// @route   POST /api/emails/send-bulk
// @access  Private/Admin
exports.sendBulkEmails = async (req, res) => {
  try {
    const { participantIds, templateId, eventId } = req.body;

    const template = await EmailTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Get event name if provided
    let eventName = "";
    if (eventId) {
      const event = await Event.findById(eventId);
      if (event) {
        eventName = event.name;
      }
    }

    const results = await emailService.sendBulkEmails(
      participantIds,
      template,
      eventName
    );

    // Emit socket notification
    const io = req.app.get("io");
    if (io) {
      io.emit("emailsSent", {
        message: `Bulk emails sent. ${
          results.filter((r) => r.success).length
        } successful.`,
        total: results.length,
        successful: results.filter((r) => r.success).length,
        userId: req.user._id,
      });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Bulk emails sent",
      details: { participantIds, templateId, count: results.length },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: `Bulk emails sent. ${
        results.filter((r) => r.success).length
      } successful.`,
      total: results.length,
      successful: results.filter((r) => r.success).length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Schedule email
// @route   POST /api/emails/schedule
// @access  Private/Admin
exports.scheduleEmail = async (req, res) => {
  try {
    const { templateId, participantIds, scheduleDate } = req.body;

    const scheduledEmail = await ScheduledEmail.create({
      templateId,
      recipients: participantIds,
      scheduleDate: new Date(scheduleDate),
      createdBy: req.user._id,
    });

    // Get io instance for notifications
    const io = req.app.get("io");

    // Schedule the email
    await scheduler.scheduleEmail(scheduledEmail._id);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Email scheduled",
      details: { scheduledEmailId: scheduledEmail._id, scheduleDate },
      status: 201,
    });

    res.status(201).json({
      success: true,
      message: "Email scheduled successfully",
      data: scheduledEmail,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get scheduled emails
// @route   GET /api/emails/scheduled
// @access  Private
exports.getScheduledEmails = async (req, res) => {
  try {
    const scheduledEmails = await ScheduledEmail.find()
      .populate("templateId", "name subject")
      .populate("recipients", "name email")
      .populate("createdBy", "name email")
      .sort({ scheduleDate: -1 });

    res.status(200).json({
      success: true,
      count: scheduledEmails.length,
      data: scheduledEmails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel scheduled email
// @route   DELETE /api/emails/scheduled/:id
// @access  Private/Admin
exports.cancelScheduledEmail = async (req, res) => {
  try {
    const scheduledEmail = await ScheduledEmail.findById(req.params.id);
    if (!scheduledEmail) {
      return res.status(404).json({
        success: false,
        message: "Scheduled email not found",
      });
    }

    scheduler.cancelScheduledEmail(req.params.id);
    scheduledEmail.status = "cancelled";
    await scheduledEmail.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Scheduled email cancelled",
      details: { scheduledEmailId: req.params.id },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Scheduled email cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
