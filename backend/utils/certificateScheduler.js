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

// Schedule certificate generation for events (called at 9:40 AM)
exports.scheduleCertificateGeneration = async () => {
  try {
    const now = new Date();
    console.log(
      `[Certificate Scheduler] Generation job running at ${now.toISOString()}`
    );

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if it's at or past 9:40 AM today
    // Since cron runs at exactly 9:40 AM, we should process events for today
    // Only skip if we're clearly before 9:40 AM (more than 1 minute early)
    const certificateTime = new Date();
    certificateTime.setHours(9, 40, 0, 0); // 9:40 AM

    // Allow processing if we're within 2 minutes of the scheduled time or after it
    // This handles any slight timing differences while preventing premature execution
    const timeDiff = now.getTime() - certificateTime.getTime();
    const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds

    if (timeDiff < -twoMinutes) {
      console.log(
        `[Certificate Scheduler] Current time is more than 2 minutes before 9:40 AM. Skipping.`
      );
      return {
        success: true,
        message: "Too early, waiting until 9:40 AM",
        count: 0,
      };
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

// Send certificates for an event (called at 9:45 AM)
exports.scheduleCertificateSending = async () => {
  try {
    const now = new Date();
    console.log(
      `[Certificate Scheduler] Sending job running at ${now.toISOString()}`
    );

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if it's at or past 9:45 AM today
    // Since cron runs at exactly 9:45 AM, we should process events for today
    // Only skip if we're clearly before 9:45 AM (more than 1 minute early)
    const sendTime = new Date();
    sendTime.setHours(9, 45, 0, 0); // 9:45 AM

    // Allow processing if we're within 2 minutes of the scheduled time or after it
    // This handles any slight timing differences while preventing premature execution
    const timeDiff = now.getTime() - sendTime.getTime();
    const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds

    if (timeDiff < -twoMinutes) {
      console.log(
        `[Certificate Scheduler] Current time is more than 2 minutes before 9:45 AM. Skipping.`
      );
      return {
        success: true,
        message: "Too early, waiting until 9:45 AM",
        count: 0,
      };
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

// Schedule certificate generation for a specific event at 9:40 AM on event day
exports.scheduleEventCertificateGeneration = (event) => {
  try {
    const eventDate = new Date(event.date);
    const scheduleDate = new Date(eventDate);
    scheduleDate.setHours(9, 40, 0, 0); // 9:40 AM

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

        // Schedule sending at 9:45 AM (later)
        const sendScheduleDate = new Date(eventDate);
        sendScheduleDate.setHours(9, 45, 0, 0); // 9:45 AM
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

// Start the daily scheduler (generation at 9:40 AM, sending at 9:45 AM every day)
exports.startDailyScheduler = () => {
  try {
    // Cron expression for generation: 40 9 * * * (9:40 AM every day)
    const generationJob = cron.schedule(
      "40 9 * * *",
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

    // Cron expression for sending: 45 9 * * * (9:45 AM every day)
    const sendingJob = cron.schedule(
      "45 9 * * *",
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
    nextGenRun.setHours(9, 40, 0, 0);
    if (nextGenRun < new Date()) {
      nextGenRun.setDate(nextGenRun.getDate() + 1);
    }

    const nextSendRun = new Date();
    nextSendRun.setHours(9, 45, 0, 0);
    if (nextSendRun < new Date()) {
      nextSendRun.setDate(nextSendRun.getDate() + 1);
    }

    console.log("========================================");
    console.log("Certificate Scheduler Started Successfully");
    console.log(`Timezone: Asia/Kolkata`);
    console.log(`Generation Schedule: Daily at 9:40 AM`);
    console.log(`Sending Schedule: Daily at 9:45 AM`);
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
