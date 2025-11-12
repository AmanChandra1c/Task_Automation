const cron = require("node-cron");
const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const Participant = require("../models/Participant");
const certificateGenerator = require("./certificateGenerator");
const emailService = require("./emailService");
const ActivityLog = require("../models/ActivityLog");

let ioInstance = null;

// Set io instance for notifications
exports.setIoInstance = (io) => {
  ioInstance = io;
};

// Schedule certificate generation and sending for events
exports.scheduleCertificateGeneration = async () => {
  try {
    const now = new Date();
    console.log(`[Certificate Scheduler] Running at ${now.toISOString()}`);

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if it's past 11:59 PM today
    const certificateTime = new Date();
    certificateTime.setHours(23, 59, 0, 0); // 11:59 PM

    // Only process if it's past 11:59 PM
    if (now < certificateTime) {
      console.log(
        `[Certificate Scheduler] Current time is before 11:59 PM. Waiting until 11:59 PM.`
      );
      return { success: true, message: "Waiting until 11:59 PM", count: 0 };
    }

    // Find all events where the date matches today (ignoring time)
    const allEvents = await Event.find().populate("participants");
    const eventsToday = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      const eventDateOnly = new Date(
        eventDate.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate()
      );
      const todayOnly = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      return eventDateOnly.getTime() === todayOnly.getTime();
    });

    if (eventsToday.length === 0) {
      console.log("[Certificate Scheduler] No events scheduled for today");
      return { success: true, message: "No events found", count: 0 };
    }

    console.log(
      `[Certificate Scheduler] Found ${eventsToday.length} event(s) scheduled for today`
    );

    let totalProcessed = 0;
    let totalSuccessful = 0;

    // Process each event
    for (const event of eventsToday) {
      try {
        const result = await exports.generateAndSendCertificatesForEvent(event);
        totalProcessed += result.length;
        totalSuccessful += result.filter((r) => r.success).length;
      } catch (error) {
        console.error(
          `[Certificate Scheduler] Error processing event ${event._id}:`,
          error
        );
      }
    }

    console.log(
      `[Certificate Scheduler] Completed: ${totalSuccessful}/${totalProcessed} certificates sent successfully`
    );

    return {
      success: true,
      eventsProcessed: eventsToday.length,
      totalProcessed,
      totalSuccessful,
    };
  } catch (error) {
    console.error("[Certificate Scheduler] Fatal error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Generate and send certificates for an event
exports.generateAndSendCertificatesForEvent = async (event) => {
  try {
    console.log(
      `[Certificate Scheduler] Processing certificates for event: ${event.name} (ID: ${event._id})`
    );

    // Find certificate template for this event
    const certificateTemplate = await Certificate.findOne({
      eventId: event._id,
    });

    if (!certificateTemplate) {
      console.log(
        `[Certificate Scheduler] No certificate template found for event: ${event.name}`
      );
      console.log(
        `[Certificate Scheduler] Please create a certificate template for this event first.`
      );
      return [];
    }

    // Get all participants for this event
    let participants = [];
    if (event.participants && event.participants.length > 0) {
      const participantIds = event.participants.map((p) =>
        typeof p === "object" ? p._id : p
      );
      participants = await Participant.find({
        _id: { $in: participantIds },
        certificateSent: false,
      });
    } else {
      participants = await Participant.find({
        eventId: event._id,
        certificateSent: false,
      });
    }

    if (participants.length === 0) {
      console.log(
        `[Certificate Scheduler] No participants found for event: ${event.name}`
      );
      return [];
    }

    console.log(
      `[Certificate Scheduler] Generating certificates for ${participants.length} participant(s)`
    );

    const results = [];

    // Generate and send certificate for each participant
    for (const participant of participants) {
      try {
        const certificate = await Certificate.findOne({ eventId: event._id });
        const templateType = certificate?.templateType || "sistec";

        const certResult = await certificateGenerator.generateCertificate(
          participant._id,
          event,
          templateType
        );

        if (certResult.success) {
          const emailResult = await emailService.sendCertificateEmail(
            participant._id,
            certResult.certificatePath,
            event
          );

          if (emailResult.success) {
            certificateTemplate.generatedCertificates.push({
              participantId: participant._id,
              certificateUrl: certResult.certificateUrl,
              sentAt: new Date(),
            });

            results.push({
              participantId: participant._id,
              success: true,
            });
          } else {
            results.push({
              participantId: participant._id,
              success: false,
              error: emailResult.message,
            });
          }
        } else {
          results.push({
            participantId: participant._id,
            success: false,
            error: certResult.message,
          });
        }
      } catch (error) {
        console.error(
          `Error processing participant ${participant._id}:`,
          error
        );
        results.push({
          participantId: participant._id,
          success: false,
          error: error.message,
        });
      }
    }

    await certificateTemplate.save();

    const successfulCount = results.filter((r) => r.success).length;
    await ActivityLog.create({
      userId: event.createdBy,
      action: "Automatic certificate generation",
      details: {
        eventId: event._id,
        eventName: event.name,
        total: results.length,
        successful: successfulCount,
      },
      status: 200,
    });

    if (ioInstance) {
      ioInstance.emit("certificatesGenerated", {
        message: `Certificates generated for ${event.name}. ${successfulCount} successful.`,
        eventId: event._id,
        eventName: event.name,
        total: results.length,
        successful: successfulCount,
      });
    }

    console.log(
      `[Certificate Scheduler] Completed: ${successfulCount}/${results.length} certificates sent successfully for event: ${event.name}`
    );

    return results;
  } catch (error) {
    console.error(
      `[Certificate Scheduler] Error generating certificates for event ${event._id}:`,
      error
    );
    throw error;
  }
};

// Schedule certificate generation for a specific event at 11:59 PM on event day
exports.scheduleEventCertificateGeneration = (event) => {
  try {
    const eventDate = new Date(event.date);
    const scheduleDate = new Date(eventDate);
    scheduleDate.setHours(23, 59, 0, 0); // 11:59 PM

    if (scheduleDate < new Date()) {
      console.log(
        `[Certificate Scheduler] Event ${event.name} date has passed, not scheduling`
      );
      return null;
    }

    const delay = scheduleDate.getTime() - new Date().getTime();

    console.log(
      `[Certificate Scheduler] Scheduling certificate generation for event: ${
        event.name
      } at ${scheduleDate.toISOString()}`
    );

    const timeoutId = setTimeout(async () => {
      try {
        console.log(
          `[Certificate Scheduler] Executing scheduled certificate generation for event: ${event.name}`
        );
        await exports.generateAndSendCertificatesForEvent(event);
      } catch (error) {
        console.error(
          `[Certificate Scheduler] Error in scheduled certificate generation:`,
          error
        );
      }
    }, delay);

    return timeoutId;
  } catch (error) {
    console.error(
      `[Certificate Scheduler] Error scheduling certificate generation:`,
      error
    );
    return null;
  }
};

// Start the daily scheduler (runs at 11:59 PM every day)
exports.startDailyScheduler = () => {
  try {
    // Cron expression: 59 23 * * * (11:59 PM every day)
    const job = cron.schedule(
      "59 23 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ========================================`
        );
        console.log(`[Certificate Scheduler] Triggered at ${timestamp}`);
        console.log(
          `[Certificate Scheduler] ========================================`
        );

        try {
          const result = await exports.scheduleCertificateGeneration();
          console.log(`[Certificate Scheduler] Result:`, result);
        } catch (error) {
          console.error(
            `[Certificate Scheduler] Error in scheduled job:`,
            error
          );
        }

        console.log(
          `[Certificate Scheduler] ========================================`
        );
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      }
    );

    const nextRun = new Date();
    nextRun.setHours(23, 59, 0, 0);
    if (nextRun < new Date()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    console.log("========================================");
    console.log("Certificate Scheduler Started Successfully");
    console.log(`Timezone: Asia/Kolkata`);
    console.log(`Schedule: Daily at 11:59 PM`);
    console.log(
      `Next run: ${nextRun.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );
    console.log("========================================");

    return job;
  } catch (error) {
    console.error("Error starting certificate scheduler:", error);
    throw error;
  }
};
