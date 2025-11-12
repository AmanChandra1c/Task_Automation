const cron = require("node-cron");
const ScheduledEmail = require("../models/ScheduledEmail");
const EmailTemplate = require("../models/EmailTemplate");
const emailService = require("./emailService");
const Event = require("../models/Event");

const scheduledJobs = new Map();
let ioInstance = null;

// Set io instance for notifications
exports.setIoInstance = (io) => {
  ioInstance = io;
};

// Schedule email
exports.scheduleEmail = async (scheduledEmailId) => {
  try {
    const scheduledEmail = await ScheduledEmail.findById(scheduledEmailId)
      .populate("templateId")
      .populate("recipients");

    if (!scheduledEmail) {
      throw new Error("Scheduled email not found");
    }

    const scheduleDate = new Date(scheduledEmail.scheduleDate);
    const now = new Date();

    if (scheduleDate <= now) {
      // Send immediately
      await exports.sendScheduledEmail(scheduledEmailId, ioInstance);
      return;
    }

    // Calculate cron expression
    const minutes = scheduleDate.getMinutes();
    const hours = scheduleDate.getHours();
    const day = scheduleDate.getDate();
    const month = scheduleDate.getMonth() + 1;
    const year = scheduleDate.getFullYear();

    // Create cron expression: minute hour day month dayOfWeek
    const cronExpression = `${minutes} ${hours} ${day} ${month} *`;

    const job = cron.schedule(
      cronExpression,
      async () => {
        await exports.sendScheduledEmail(scheduledEmailId, ioInstance);
        scheduledJobs.delete(scheduledEmailId.toString());
        job.stop();
      },
      {
        scheduled: false,
        timezone: "Asia/Kolkata",
      }
    );

    job.start();
    scheduledJobs.set(scheduledEmailId.toString(), job);

    return { success: true, message: "Email scheduled successfully" };
  } catch (error) {
    throw new Error(`Error scheduling email: ${error.message}`);
  }
};

// Send scheduled email
exports.sendScheduledEmail = async (scheduledEmailId, io = null) => {
  try {
    const scheduledEmail = await ScheduledEmail.findById(scheduledEmailId)
      .populate("templateId")
      .populate("recipients")
      .populate("createdBy");

    if (!scheduledEmail) {
      throw new Error("Scheduled email not found");
    }

    // Get event if exists
    let eventName = "";
    if (scheduledEmail.recipients && scheduledEmail.recipients.length > 0) {
      const participant = scheduledEmail.recipients[0];
      if (participant.eventId) {
        const event = await Event.findById(participant.eventId);
        if (event) {
          eventName = event.name;
        }
      }
    }

    const results = await emailService.sendBulkEmails(
      scheduledEmail.recipients.map((r) => r._id),
      scheduledEmail.templateId,
      eventName
    );

    scheduledEmail.status = "sent";
    scheduledEmail.sentAt = new Date();
    await scheduledEmail.save();

    // Emit socket notification if io is provided
    if (io) {
      io.emit("emailsSent", {
        message: `Scheduled emails sent. ${
          results.filter((r) => r.success).length
        } successful.`,
        total: results.length,
        successful: results.filter((r) => r.success).length,
        userId: scheduledEmail.createdBy?._id,
      });
    }

    return { success: true, results };
  } catch (error) {
    const scheduledEmail = await ScheduledEmail.findById(scheduledEmailId);
    if (scheduledEmail) {
      scheduledEmail.status = "failed";
      scheduledEmail.errorMessage = error.message;
      await scheduledEmail.save();
    }
    throw error;
  }
};

// Cancel scheduled email
exports.cancelScheduledEmail = (scheduledEmailId) => {
  const job = scheduledJobs.get(scheduledEmailId.toString());
  if (job) {
    job.stop();
    scheduledJobs.delete(scheduledEmailId.toString());
    return { success: true, message: "Scheduled email cancelled" };
  }
  return { success: false, message: "Scheduled email not found" };
};
