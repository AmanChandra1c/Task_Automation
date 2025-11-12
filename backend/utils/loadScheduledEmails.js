const ScheduledEmail = require("../models/ScheduledEmail");
const scheduler = require("./scheduler");

// Load and reschedule pending emails on server start
const loadScheduledEmails = async (io) => {
  try {
    // Set io instance first
    scheduler.setIoInstance(io);

    const pendingEmails = await ScheduledEmail.find({
      status: "pending",
      scheduleDate: { $gt: new Date() },
    })
      .populate("templateId")
      .populate("recipients");

    for (const scheduledEmail of pendingEmails) {
      try {
        await scheduler.scheduleEmail(scheduledEmail._id);
        console.log(`Rescheduled email: ${scheduledEmail._id}`);
      } catch (error) {
        console.error(
          `Error rescheduling email ${scheduledEmail._id}:`,
          error.message
        );
      }
    }

    console.log(`Loaded ${pendingEmails.length} scheduled emails`);
  } catch (error) {
    console.error("Error loading scheduled emails:", error.message);
  }
};

module.exports = loadScheduledEmails;
