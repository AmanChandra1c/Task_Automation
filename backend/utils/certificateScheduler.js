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

// Schedule certificate generation for events (called at 10:30 AM)
exports.scheduleCertificateGeneration = async () => {
  try {
    const now = new Date();
    console.log(
      `[Certificate Scheduler] Generation job running at ${now.toISOString()}`
    );

    // Helper function to get IST date for comparison
    const getISTDate = (date) => {
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(date.getTime() + istOffset);
      return new Date(
        Date.UTC(
          istTime.getUTCFullYear(),
          istTime.getUTCMonth(),
          istTime.getUTCDate()
        )
      );
    };

    // Get today's date in IST
    const todayIST = getISTDate(now);

    // Find all events where the date matches today (ignoring time)
    const allEvents = await Event.find().populate("participants");
    const eventsToday = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      const eventDateIST = getISTDate(eventDate);
      return eventDateIST.getTime() === todayIST.getTime();
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

// Send certificates for an event (called at 11:55 AM)
exports.scheduleCertificateSending = async () => {
  try {
    const now = new Date();
    console.log(
      `[Certificate Scheduler] Sending job running at ${now.toISOString()}`
    );

    // Helper function to get IST date for comparison
    const getISTDate = (date) => {
      const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
      const istTime = new Date(date.getTime() + istOffset);
      return new Date(
        Date.UTC(
          istTime.getUTCFullYear(),
          istTime.getUTCMonth(),
          istTime.getUTCDate()
        )
      );
    };

    // Get today's date in IST
    const todayIST = getISTDate(now);

    // Find all events where the date matches today (ignoring time)
    const allEvents = await Event.find().populate("participants");
    const eventsToday = allEvents.filter((event) => {
      const eventDate = new Date(event.date);
      const eventDateIST = getISTDate(eventDate);
      return eventDateIST.getTime() === todayIST.getTime();
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

// Schedule certificate generation for a specific event at 10:30 AM on event day
exports.scheduleEventCertificateGeneration = (event) => {
  try {
    const eventDate = new Date(event.date);
    const scheduleDate = new Date(eventDate);
    scheduleDate.setHours(10, 30, 0, 0); // 10:30 AM

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

        // Schedule sending at 11:55 AM (later)
        const sendScheduleDate = new Date(eventDate);
        sendScheduleDate.setHours(11, 55, 0, 0); // 11:55 AM
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

// Start the daily scheduler (generation at 10:30 AM, sending at 11:55 AM every day)
exports.startDailyScheduler = () => {
  try {
    // Cron expression for generation: 30 10 * * * (10:30 AM every day)
    const generationJob = cron.schedule(
      "30 10 * * *",
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

    // Cron expression for sending: 55 11 * * * (11:55 AM every day)
    const sendingJob = cron.schedule(
      "55 11 * * *",
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
    nextGenRun.setHours(10, 30, 0, 0);
    if (nextGenRun < new Date()) {
      nextGenRun.setDate(nextGenRun.getDate() + 1);
    }

    const nextSendRun = new Date();
    nextSendRun.setHours(11, 55, 0, 0);
    if (nextSendRun < new Date()) {
      nextSendRun.setDate(nextSendRun.getDate() + 1);
    }

    console.log("========================================");
    console.log("Certificate Scheduler Started Successfully");
    console.log(`Timezone: Asia/Kolkata`);
    console.log(`Generation Schedule: Daily at 10:30 AM`);
    console.log(`Sending Schedule: Daily at 11:55 AM`);
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
