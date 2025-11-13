const cron = require("node-cron");
const Event = require("../models/Event");
const certificateHelper = require("./certificateHelper");

let ioInstance = null;

// Helper function to get events scheduled for today
const getEventsForToday = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allEvents = await Event.find().populate("participants");
  return allEvents.filter((event) => {
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
};

// Set io instance for notifications
exports.setIoInstance = (io) => {
  ioInstance = io;
};

// Schedule certificate generation for events (called at 10:30 PM)
exports.scheduleCertificateGeneration = async () => {
  try {
    const now = new Date();
    console.log(`[Certificate Scheduler] Generation job running at ${now.toISOString()}`);

    // Check if it's past 10:30 PM today
    const certificateTime = new Date();
    certificateTime.setHours(22, 30, 0, 0); // 10:30 PM

    // Only process if it's past 10:30 PM
    if (now < certificateTime) {
      console.log(
        `[Certificate Scheduler] Current time is before 10:30 PM. Waiting until 10:30 PM.`
      );
      return { success: true, message: "Waiting until 10:30 PM", count: 0 };
    }

    // Find all events scheduled for today
    const eventsToday = await getEventsForToday();

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
        const result = await certificateHelper.generateCertificatesForNewParticipants(event._id);
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
      eventsProcessed: eventsToProcess.length,
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

// Send certificates for an event (called at 11:59 PM)
exports.scheduleCertificateSending = async () => {
  try {
    const now = new Date();
    console.log(`[Certificate Scheduler] Sending job running at ${now.toISOString()}`);

    // Check if it's past 11:59 PM today
    const sendTime = new Date();
    sendTime.setHours(23, 59, 0, 0); // 11:59 PM

    // Only process if it's past 11:59 PM
    if (now < sendTime) {
      console.log(
        `[Certificate Scheduler] Current time is before 11:59 PM. Waiting until 11:59 PM.`
      );
      return { success: true, message: "Waiting until 11:59 PM", count: 0 };
    }

    // Get all events that have passed or are today (events where participants might have certificates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allEvents = await Event.find().populate("participants");
    const eventsToProcess = allEvents.filter((event) => {
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
      // Process events that are today or in the past
      return eventDateOnly.getTime() <= todayOnly.getTime();
    });

    if (eventsToProcess.length === 0) {
      console.log("[Certificate Scheduler] No events found to process for sending");
      return { success: true, message: "No events found", count: 0 };
    }

    console.log(
      `[Certificate Scheduler] Found ${eventsToProcess.length} event(s) to process for sending certificates`
    );

    let totalProcessed = 0;
    let totalSuccessful = 0;

    // Process each event - send certificates only
    for (const event of eventsToProcess) {
      try {
        const result = await certificateHelper.sendGeneratedCertificates(event._id);
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
      eventsProcessed: eventsToProcess.length,
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


// Schedule certificate generation for a specific event at 10:30 PM on event day
exports.scheduleEventCertificateGeneration = (event) => {
  try {
    const eventDate = new Date(event.date);
    const scheduleDate = new Date(eventDate);
    scheduleDate.setHours(22, 30, 0, 0); // 10:30 PM

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
        await certificateHelper.generateCertificatesForNewParticipants(event._id);
        
        // Schedule sending at 11:59 PM
        const sendScheduleDate = new Date(eventDate);
        sendScheduleDate.setHours(23, 59, 0, 0); // 11:59 PM
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

// Start the daily scheduler (generation at 10:30 PM, sending at 11:59 PM every day)
exports.startDailyScheduler = () => {
  try {
    // Cron expression for generation: 30 22 * * * (10:30 PM every day)
    const generationJob = cron.schedule(
      "30 22 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ========================================`
        );
        console.log(`[Certificate Scheduler] Generation job triggered at ${timestamp}`);
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

    // Cron expression for sending: 59 23 * * * (11:59 PM every day)
    const sendingJob = cron.schedule(
      "59 23 * * *",
      async () => {
        const timestamp = new Date().toISOString();
        console.log(
          `[Certificate Scheduler] ========================================`
        );
        console.log(`[Certificate Scheduler] Sending job triggered at ${timestamp}`);
        console.log(
          `[Certificate Scheduler] ========================================`
        );

        try {
          const result = await exports.scheduleCertificateSending();
          console.log(`[Certificate Scheduler] Sending Result:`, result);
        } catch (error) {
          console.error(
            `[Certificate Scheduler] Error in sending job:`,
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

    const nextGenRun = new Date();
    nextGenRun.setHours(22, 30, 0, 0);
    if (nextGenRun < new Date()) {
      nextGenRun.setDate(nextGenRun.getDate() + 1);
    }

    const nextSendRun = new Date();
    nextSendRun.setHours(23, 59, 0, 0);
    if (nextSendRun < new Date()) {
      nextSendRun.setDate(nextSendRun.getDate() + 1);
    }

    console.log("========================================");
    console.log("Certificate Scheduler Started Successfully");
    console.log(`Timezone: Asia/Kolkata`);
    console.log(`Generation Schedule: Daily at 10:30 PM`);
    console.log(`Sending Schedule: Daily at 11:59 PM`);
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
