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

// Generate certificates only for an event (at 15:50 IST)
exports.generateCertificatesForEvent = async (event) => {
  try {
    console.log(
      `[Certificate Scheduler] (15:50) Generating certificates for event: ${event.name} (ID: ${event._id})`
    );

    const certificateTemplate = await Certificate.findOne({
      eventId: event._id,
    });

    if (!certificateTemplate) {
      console.log(
        `[Certificate Scheduler] No certificate template found for event: ${event.name}`
      );
      return { total: 0, generated: 0 };
    }

    if (!Array.isArray(certificateTemplate.generatedCertificates)) {
      certificateTemplate.generatedCertificates = [];
    }

    const alreadyGeneratedIds = new Set(
      certificateTemplate.generatedCertificates
        .filter((g) => g.generatedAt)
        .map((g) => String(g.participantId))
    );

    let participants = [];
    if (event.participants && event.participants.length > 0) {
      const participantIds = event.participants.map((p) =>
        typeof p === "object" ? String(p._id) : String(p)
      );
      participants = await Participant.find({
        _id: { $in: participantIds },
      });
    } else {
      participants = await Participant.find({
        eventId: event._id,
      });
    }

    const toGenerate = participants.filter(
      (participant) => !alreadyGeneratedIds.has(String(participant._id))
    );

    if (toGenerate.length === 0) {
      console.log(
        `[Certificate Scheduler] No new participants to generate for event: ${event.name}`
      );
      return { total: 0, generated: 0 };
    }

    const certificate = await Certificate.findOne({ eventId: event._id });
    const templateType = certificate?.templateType || "sistec";
    const results = [];

    for (const participant of toGenerate) {
      try {
        const certResult = await certificateGenerator.generateCertificate(
          participant._id,
          event,
          templateType
        );

        if (certResult.success) {
          const entryIndex =
            certificateTemplate.generatedCertificates.findIndex(
              (g) => String(g.participantId) === String(participant._id)
            );

          const payload = {
            participantId: participant._id,
            certificateUrl: certResult.certificateUrl,
            certificatePath: certResult.certificatePath,
            generatedAt: new Date(),
          };

          if (entryIndex === -1) {
            certificateTemplate.generatedCertificates.push(payload);
          } else {
            certificateTemplate.generatedCertificates[entryIndex] = {
              ...certificateTemplate.generatedCertificates[entryIndex],
              ...payload,
              sentAt:
                certificateTemplate.generatedCertificates[entryIndex].sentAt ||
                null,
            };
          }

          results.push({ participantId: participant._id, success: true });
        } else {
          results.push({
            participantId: participant._id,
            success: false,
            error: certResult.message,
          });
        }
      } catch (error) {
        console.error(
          `[Certificate Scheduler] Error generating certificate for participant ${participant._id}:`,
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
      action: "Automatic certificate generation (15:50)",
      details: {
        eventId: event._id,
        eventName: event.name,
        total: results.length,
        successful: successfulCount,
      },
      status: 200,
    });

    if (ioInstance) {
      ioInstance.emit("certificatesPrepared", {
        message: `Certificates prepared for ${event.name}. ${successfulCount} generated.`,
        eventId: event._id,
        eventName: event.name,
        total: results.length,
        successful: successfulCount,
      });
    }

    console.log(
      `[Certificate Scheduler] (15:50) Completed generation: ${successfulCount}/${results.length} for event: ${event.name}`
    );

    return { total: results.length, generated: successfulCount };
  } catch (error) {
    console.error(
      `[Certificate Scheduler] Error during generation-only for event ${event._id}:`,
      error
    );
    throw error;
  }
};

// Send certificates only for an event (at 16:00 IST)
exports.sendCertificatesForEvent = async (event) => {
  try {
    console.log(
      `[Certificate Scheduler] (16:00) Sending certificates for event: ${event.name} (ID: ${event._id})`
    );

    const certificateTemplate = await Certificate.findOne({
      eventId: event._id,
    });

    if (
      !certificateTemplate ||
      !Array.isArray(certificateTemplate.generatedCertificates)
    ) {
      console.log(
        `[Certificate Scheduler] No generated certificates found for event: ${event.name}`
      );
      return { total: 0, sent: 0 };
    }

    const pendingSends = certificateTemplate.generatedCertificates.filter(
      (g) => g.generatedAt && !g.sentAt
    );

    if (pendingSends.length === 0) {
      console.log(
        `[Certificate Scheduler] No pending certificates to send for event: ${event.name}`
      );
      return { total: 0, sent: 0 };
    }

    let sentCount = 0;

    for (const gen of pendingSends) {
      try {
        const emailResult = await emailService.sendCertificateEmail(
          gen.participantId,
          gen.certificatePath,
          event
        );
        if (emailResult.success) {
          gen.sentAt = new Date();
          sentCount += 1;

          await Participant.updateOne(
            { _id: gen.participantId },
            { certificateSent: true }
          );
        }
      } catch (error) {
        console.error(
          `[Certificate Scheduler] Error sending certificate for participant ${gen.participantId}:`,
          error
        );
      }
    }

    await certificateTemplate.save();

    await ActivityLog.create({
      userId: event.createdBy,
      action: "Automatic certificate dispatch (16:00)",
      details: {
        eventId: event._id,
        eventName: event.name,
        total: pendingSends.length,
        successful: sentCount,
      },
      status: 200,
    });

    if (ioInstance) {
      ioInstance.emit("certificatesSent", {
        message: `Certificates sent for ${event.name}. ${sentCount} dispatched.`,
        eventId: event._id,
        eventName: event.name,
        total: pendingSends.length,
        successful: sentCount,
      });
    }

    console.log(
      `[Certificate Scheduler] (16:00) Completed sending: ${sentCount}/${pendingSends.length} for event: ${event.name}`
    );

    return { total: pendingSends.length, sent: sentCount };
  } catch (error) {
    console.error(
      `[Certificate Scheduler] Error during send-only for event ${event._id}:`,
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

// Start the daily scheduler
exports.startDailyScheduler = () => {
  try {
    // Job 1: 15:50 IST - Generate certificates for today's events
    const generateJob = cron.schedule(
      "50 15 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ======================= 15:50 GENERATE =======================`
        );
        console.log(`[Certificate Scheduler] Triggered at ${timestamp}`);
        console.log(
          `[Certificate Scheduler] ===========================================================`
        );

        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
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

          for (const event of eventsToday) {
            await exports.generateCertificatesForEvent(event);
          }
        } catch (error) {
          console.error(
            `[Certificate Scheduler] Error in 15:50 generation job:`,
            error
          );
        }

        console.log(
          `[Certificate Scheduler] ===========================================================`
        );
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    // Job 2: 16:00 IST - Send certificates for today's events
    const sendJob = cron.schedule(
      "0 16 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ========================= 16:00 SEND =========================`
        );
        console.log(`[Certificate Scheduler] Triggered at ${timestamp}`);
        console.log(
          `[Certificate Scheduler] ===========================================================`
        );

        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
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

          for (const event of eventsToday) {
            await exports.sendCertificatesForEvent(event);
          }
        } catch (error) {
          console.error(
            `[Certificate Scheduler] Error in 16:00 send job:`,
            error
          );
        }

        console.log(
          `[Certificate Scheduler] ===========================================================`
        );
      },
      { scheduled: true, timezone: "Asia/Kolkata" }
    );

    const generateNextRun = new Date();
    generateNextRun.setHours(15, 50, 0, 0);
    if (generateNextRun < new Date()) {
      generateNextRun.setDate(generateNextRun.getDate() + 1);
    }

    const sendNextRun = new Date();
    sendNextRun.setHours(16, 0, 0, 0);
    if (sendNextRun < new Date()) {
      sendNextRun.setDate(sendNextRun.getDate() + 1);
    }

    console.log("========================================");
    console.log("Certificate Scheduler Started Successfully");
    console.log(`Timezone: Asia/Kolkata`);
    console.log(`Schedules:`);
    console.log(`- Daily generation at 15:50 PM`);
    console.log(
      `  Next run: ${generateNextRun.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );
    console.log(`- Daily sending at 04:00 PM`);
    console.log(
      `  Next run: ${sendNextRun.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })}`
    );
    console.log(
      "======================================================================="
    );

    return { generateJob, sendJob };
  } catch (error) {
    console.error("Error starting certificate scheduler:", error);
    throw error;
  }
};
