const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const Participant = require("../models/Participant");
const certificateGenerator = require("./certificateGenerator");
const emailService = require("./emailService");

/**
 * Generate and send certificates for new participants if event date has passed
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

    // Set both dates to start of day for comparison
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

    // Check if event date is today
    const isEventToday = eventDateOnly.getTime() === todayOnly.getTime();

    // 🔹 Certificate generation time set to 9:55 AM (09:55)
    const certificateTime = new Date(today);
    certificateTime.setHours(9, 55, 0, 0); // 9:55 AM

    const now = new Date();

    // If event date is in the future, don't generate certificates yet
    if (eventDateOnly > todayOnly) {
      console.log(
        `[Certificate Helper] Event ${
          event.name
        } date is in the future. Certificates will be generated at 9:55 AM on ${eventDate.toDateString()}`
      );
      return {
        success: true,
        message:
          "Event date is in the future. Certificates will be generated automatically at 9:55 AM on event day.",
        scheduled: true,
      };
    }

    // If event is today but it's before 9:55 AM, don't generate yet
    if (isEventToday && now < certificateTime) {
      console.log(
        `[Certificate Helper] Event ${event.name} is today but it's before 9:55 AM. Certificates will be generated at 9:55 AM today.`
      );
      return {
        success: true,
        message:
          "Event is today but it's before 9:55 AM. Certificates will be generated automatically at 9:55 AM today.",
        scheduled: true,
      };
    }

    // Event date has passed, generate certificates for participants who haven't received them
    let participants;
    if (participantIds && participantIds.length > 0) {
      // Generate for specific participants
      participants = await Participant.find({
        _id: { $in: participantIds },
        eventId: eventId,
        certificateSent: { $ne: true }, // Only those who haven't received certificates
      });
    } else {
      // Generate for all participants of this event who haven't received certificates
      participants = await Participant.find({
        eventId: eventId,
        certificateSent: { $ne: true },
      });
    }

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

    // Generate certificates for each participant
    for (const participant of participants) {
      try {
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
      message: `Certificates generated for ${successfulCount} participant(s). Emails will be sent at 10:00 AM.`,
      total: results.length,
      successful: successfulCount,
      failed: results.length - successfulCount,
      results: results,
      scheduled: false,
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
 * Send certificates that were already generated (called at 10:00 AM)
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
          // Update certificate record
          if (generatedCert) {
            generatedCert.sentAt = new Date();
          }

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
