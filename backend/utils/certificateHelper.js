const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const Participant = require("../models/Participant");
const certificateGenerator = require("./certificateGenerator");
const emailService = require("./emailService");

// Helper function to compare dates (ignoring time)
const compareDates = (date1, date2) => {
  const d1 = new Date(
    date1.getFullYear(),
    date1.getMonth(),
    date1.getDate()
  );
  const d2 = new Date(
    date2.getFullYear(),
    date2.getMonth(),
    date2.getDate()
  );
  return {
    date1: d1,
    date2: d2,
    isEqual: d1.getTime() === d2.getTime(),
    isAfter: d1.getTime() > d2.getTime(),
  };
};

/**
 * Generate certificates for new participants if event date has passed
 * @param {String} eventId - Event ID
 * @param {Array} participantIds - Array of participant IDs (optional, if not provided, will fetch all participants for the event)
 */
exports.generateCertificatesForNewParticipants = async (
  eventId,
  participantIds = null
) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`[Certificate Helper] Event ${eventId} not found`);
      return { success: false, message: "Event not found" };
    }

    // Check if event date is today or has passed (check date only, not time)
    const eventDate = new Date(event.date);
    const today = new Date();
    const dateComparison = compareDates(eventDate, today);
    const isEventToday = dateComparison.isEqual;

    // Certificate generation time set to 10:30 PM
    const certificateTime = new Date(today);
    certificateTime.setHours(22, 30, 0, 0); // 10:30 PM

    const now = new Date();

    // If event date is in the future, don't generate certificates yet
    if (dateComparison.isAfter) {
      console.log(
        `[Certificate Helper] Event ${
          event.name
        } date is in the future. Certificates will be generated at 10:30 PM on ${eventDate.toDateString()}`
      );
      return {
        success: true,
        message:
          "Event date is in the future. Certificates will be generated automatically at 10:30 PM on event day.",
        scheduled: true,
      };
    }

    // If event is today but it's before 10:30 PM, don't generate yet
    if (isEventToday && now < certificateTime) {
      console.log(
        `[Certificate Helper] Event ${event.name} is today but it's before 10:30 PM. Certificates will be generated at 10:30 PM today.`
      );
      return {
        success: true,
        message:
          "Event is today but it's before 10:30 PM. Certificates will be generated automatically at 10:30 PM today.",
        scheduled: true,
      };
    }

    // Event date has passed, generate certificates for participants who haven't received them
    const query = {
      eventId: eventId,
      certificateSent: { $ne: true },
    };
    
    if (participantIds && participantIds.length > 0) {
      query._id = { $in: participantIds };
    }
    
    const participants = await Participant.find(query);

    if (participants.length === 0) {
      console.log(
        `[Certificate Helper] No new participants found for event ${event.name} or all have already received certificates`
      );
      return {
        success: true,
        message:
          "No new participants found or all have already received certificates",
        count: 0,
      };
    }

    console.log(
      `[Certificate Helper] Generating certificates for ${participants.length} new participant(s) for event: ${event.name}`
    );

    // Get certificate template for this event
    const certificate = await Certificate.findOne({ eventId: event._id });
    if (!certificate) {
      console.log(
        `[Certificate Helper] No certificate template found for event ${event.name}`
      );
      return {
        success: false,
        message: "Certificate template not found for this event",
      };
    }

    const templateType = certificate.templateType || "sistec";
    const results = [];

    // Generate certificates for each participant (sending will happen separately at 11:59 PM)
    for (const participant of participants) {
      try {
        // Check if certificate already exists for this participant
        const existingCert = certificate.generatedCertificates.find(
          (cert) =>
            cert.participantId &&
            cert.participantId.toString() === participant._id.toString()
        );

        if (existingCert && existingCert.certificatePath) {
          console.log(
            `[Certificate Helper] Certificate already exists for ${participant.name}, skipping generation`
          );
          results.push({
            participantId: participant._id,
            participantName: participant.name,
            success: true,
            certificatePath: existingCert.certificatePath,
            skipped: true,
          });
          continue;
        }

        // Generate certificate only
        const certResult = await certificateGenerator.generateCertificate(
          participant._id,
          event,
          templateType
        );

        if (certResult.success) {
          // Store certificate info for later sending
          certificate.generatedCertificates.push({
            participantId: participant._id,
            certificateUrl: certResult.certificateUrl,
            certificatePath: certResult.certificatePath,
            generatedAt: new Date(),
            sentAt: null,
          });

          results.push({
            participantId: participant._id,
            participantName: participant.name,
            success: true,
            certificatePath: certResult.certificatePath,
          });

          console.log(
            `[Certificate Helper] Certificate generated for ${participant.name} (${participant.email})`
          );
        } else {
          results.push({
            participantId: participant._id,
            participantName: participant.name,
            success: false,
            error: certResult.message || "Certificate generation failed",
          });
        }
      } catch (error) {
        console.error(
          `[Certificate Helper] Error processing participant ${participant._id}:`,
          error
        );
        results.push({
          participantId: participant._id,
          participantName: participant.name,
          success: false,
          error: error.message,
        });
      }
    }

    // Save certificate template with generated certificates
    await certificate.save();

    const successfulCount = results.filter((r) => r.success).length;
    console.log(
      `[Certificate Helper] Completed: ${successfulCount}/${results.length} certificates generated successfully for event: ${event.name}`
    );

    return {
      success: true,
      message: `Certificates generated for ${successfulCount} participant(s). Emails will be sent at 11:59 PM.`,
      total: results.length,
      successful: successfulCount,
      failed: results.length - successfulCount,
      results: results,
    };
  } catch (error) {
    console.error(
      `[Certificate Helper] Error generating certificates for event ${eventId}:`,
      error
    );
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Send certificates that were already generated (called at 11:59 PM)
 * @param {String} eventId - Event ID
 */
exports.sendGeneratedCertificates = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`[Certificate Helper] Event ${eventId} not found`);
      return { success: false, message: "Event not found" };
    }

    // Get certificate template for this event
    const certificate = await Certificate.findOne({ eventId: event._id });
    if (!certificate) {
      console.log(
        `[Certificate Helper] No certificate template found for event ${event.name}`
      );
      return {
        success: false,
        message: "Certificate template not found for this event",
      };
    }

    // Find participants who have certificates generated but not sent
    const participantsToSend = await Participant.find({
      eventId: eventId,
      certificateSent: { $ne: true },
    });

    if (participantsToSend.length === 0) {
      console.log(
        `[Certificate Helper] No participants found with unsent certificates for event ${event.name}`
      );
      return {
        success: true,
        message: "No participants found with unsent certificates",
        count: 0,
      };
    }

    console.log(
      `[Certificate Helper] Sending certificates to ${participantsToSend.length} participant(s) for event: ${event.name}`
    );

    const results = [];
    let sentCount = 0;

    // Send certificates to each participant
    for (const participant of participantsToSend) {
      try {
        // Find the generated certificate for this participant
        const generatedCert = certificate.generatedCertificates.find(
          (cert) =>
            cert.participantId &&
            cert.participantId.toString() === participant._id.toString()
        );

        if (!generatedCert || !generatedCert.certificatePath) {
          console.log(
            `[Certificate Helper] No certificate found for participant ${participant.name}`
          );
          results.push({
            participantId: participant._id,
            participantName: participant.name,
            success: false,
            error: "Certificate not generated",
          });
          continue;
        }

        // Send certificate via email
        const emailResult = await emailService.sendCertificateEmail(
          participant._id,
          generatedCert.certificatePath,
          event
        );

        if (emailResult.success) {
          // Update certificate record sent timestamp
          generatedCert.sentAt = new Date();

          // Update participant's certificateSent flag and timestamp
          participant.certificateSent = true;
          participant.certificateSentAt = new Date();
          await participant.save();

          results.push({
            participantId: participant._id,
            participantName: participant.name,
            success: true,
          });

          sentCount++;
          console.log(
            `[Certificate Helper] Certificate sent to ${participant.name} (${participant.email})`
          );
        } else {
          results.push({
            participantId: participant._id,
            participantName: participant.name,
            success: false,
            error: emailResult.message || "Email sending failed",
          });
        }
      } catch (error) {
        console.error(
          `[Certificate Helper] Error sending certificate to participant ${participant._id}:`,
          error
        );
        results.push({
          participantId: participant._id,
          participantName: participant.name,
          success: false,
          error: error.message,
        });
      }
    }

    // Save certificate template with updated sent status
    await certificate.save();

    console.log(
      `[Certificate Helper] Completed: ${sentCount}/${results.length} certificates sent successfully for event: ${event.name}`
    );

    return {
      success: true,
      message: `Certificates sent to ${sentCount} participant(s)`,
      total: results.length,
      successful: sentCount,
      failed: results.length - sentCount,
      results: results,
    };
  } catch (error) {
    console.error(
      `[Certificate Helper] Error sending certificates for event ${eventId}:`,
      error
    );
    return {
      success: false,
      message: error.message,
    };
  }
};
