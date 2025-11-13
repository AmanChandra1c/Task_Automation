const cron = require("node-cron");
const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const Participant = require("../models/Participant");
const certificateGenerator = require("./certificateGenerator");
const emailService = require("./emailService");
const certificateHelper = require("./certificateHelper");
const ActivityLog = require("../models/ActivityLog");

let ioInstance = null;

// Set io instance for notifications
exports.setIoInstance = (io) => {
  ioInstance = io;
};

// Schedule certificate generation for events (called at 5:40 PM)
exports.scheduleCertificateGeneration = async () => {
  try {
    const now = new Date();
    console.log(
      `[Certificate Scheduler] Generation job running at ${now.toISOString()}`
    );

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if it's past 5:40 PM today
    const certificateTime = new Date();
    certificateTime.setHours(17, 40, 0, 0); // 5:40 PM

    // Only process if it's past 5:40 PM
    if (now < certificateTime) {
      console.log(
        `[Certificate Scheduler] Current time is before 5:40 PM. Waiting until 5:40 PM.`
      );
      return { success: true, message: "Waiting until 5:40 PM", count: 0 };
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

    // Process each event - generate certificates only
    for (const event of eventsToday) {
      try {
        const result =
          await certificateHelper.generateCertificatesForNewParticipants(
            event._id
          );
        if (result.success) {
          totalProcessed += result.total || 0;
          totalSuccessful += result.successful || 0;
        }
      } catch (error) {
        console.error(
          `[Certificate Scheduler] Error generating certificates for event ${event._id}:`,
          error
        );
      }
    }

    console.log(
      `[Certificate Scheduler] Completed: ${totalSuccessful}/${totalProcessed} certificates generated successfully`
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

// Send certificates for an event (called at 5:45 PM)
exports.scheduleCertificateSending = async () => {
  try {
    const now = new Date();
    console.log(
      `[Certificate Scheduler] Sending job running at ${now.toISOString()}`
    );

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if it's past 5:45 PM today
    const sendTime = new Date();
    sendTime.setHours(17, 45, 0, 0); // 5:45 PM

    // Only process if it's past 5:45 PM
    if (now < sendTime) {
      console.log(
        `[Certificate Scheduler] Current time is before 5:45 PM. Waiting until 5:45 PM.`
      );
      return { success: true, message: "Waiting until 5:45 PM", count: 0 };
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
      `[Certificate Scheduler] Found ${eventsToday.length} event(s) to send certificates for today`
    );

    let totalProcessed = 0;
    let totalSuccessful = 0;

    // Process each event - send certificates only
    for (const event of eventsToday) {
      try {
        const result = await certificateHelper.sendGeneratedCertificates(
          event._id
        );
        if (result.success) {
          totalProcessed += result.total || 0;
          totalSuccessful += result.successful || 0;
        }
      } catch (error) {
        console.error(
          `[Certificate Scheduler] Error sending certificates for event ${event._id}:`,
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
    console.error("[Certificate Scheduler] Fatal error in sending job:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Generate and send certificates for an event (legacy function, kept for backward compatibility)
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

// Schedule certificate generation for a specific event at 5:40 PM on event day
exports.scheduleEventCertificateGeneration = (event) => {
  try {
    const eventDate = new Date(event.date);
    const scheduleDate = new Date(eventDate);
    scheduleDate.setHours(17, 40, 0, 0); // 5:40 PM

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
        await certificateHelper.generateCertificatesForNewParticipants(
          event._id
        );

        // Schedule sending at 5:45 PM (5 minutes later)
        const sendScheduleDate = new Date(eventDate);
        sendScheduleDate.setHours(17, 45, 0, 0); // 5:45 PM
        const sendDelay = sendScheduleDate.getTime() - new Date().getTime();

        if (sendDelay > 0) {
          setTimeout(async () => {
            try {
              console.log(
                `[Certificate Scheduler] Executing scheduled certificate sending for event: ${event.name}`
              );
              await certificateHelper.sendGeneratedCertificates(event._id);
            } catch (error) {
              console.error(
                `[Certificate Scheduler] Error in scheduled certificate sending:`,
                error
              );
            }
          }, sendDelay);
        }
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

// Start the daily scheduler (generation at 5:40 PM, sending at 5:45 PM every day)
exports.startDailyScheduler = () => {
  try {
    // Cron expression for generation: 40 17 * * * (5:40 PM every day)
    const generationJob = cron.schedule(
      "40 17 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ========================================`
        );
        console.log(
          `[Certificate Scheduler] Generation job triggered at ${timestamp}`
        );
        console.log(
          `[Certificate Scheduler] ========================================`
        );

        try {
          const result = await exports.scheduleCertificateGeneration();
          console.log(`[Certificate Scheduler] Generation Result:`, result);
        } catch (error) {
          console.error(
            `[Certificate Scheduler] Error in generation job:`,
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

    // Cron expression for sending: 45 17 * * * (5:45 PM every day)
    const sendingJob = cron.schedule(
      "45 17 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ========================================`
        );
        console.log(
          `[Certificate Scheduler] Sending job triggered at ${timestamp}`
        );
        console.log(
          `[Certificate Scheduler] ========================================`
        );

        try {
          const result = await exports.scheduleCertificateSending();
          console.log(`[Certificate Scheduler] Sending Result:`, result);
        } catch (error) {
          console.error(`[Certificate Scheduler] Error in sending job:`, error);
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

    const nextGenRun = new Date();
    nextGenRun.setHours(17, 40, 0, 0);
    if (nextGenRun < new Date()) {
      nextGenRun.setDate(nextGenRun.getDate() + 1);
    }

    const nextSendRun = new Date();
    nextSendRun.setHours(17, 45, 0, 0);
    if (nextSendRun < new Date()) {
      nextSendRun.setDate(nextSendRun.getDate() + 1);
    }

    console.log("========================================");
    console.log("Certificate Scheduler Started Successfully");
    console.log(`Timezone: Asia/Kolkata`);
    console.log(`Generation Schedule: Daily at 5:40 PM`);
    console.log(`Sending Schedule: Daily at 5:45 PM`);
    console.log(
      `Next generation run: ${nextGenRun.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );
    console.log(
      `Next sending run: ${nextSendRun.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );
    console.log("========================================");

    return { generationJob, sendingJob };
  } catch (error) {
    console.error("Error starting certificate scheduler:", error);
    throw error;
  }
};
