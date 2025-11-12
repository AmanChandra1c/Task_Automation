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

    // 🔹 Certificate generation time changed from 1:50 PM → 10:30 PM
    const certificateTime = new Date(today);
    certificateTime.setHours(22, 30, 0, 0); // 10:30 PM

    const now = new Date();

    // If event date is in the future, don't generate certificates yet
    if (eventDateOnly > todayOnly) {
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

    // Generate and send certificate for each participant
    for (const participant of participants) {
      try {
        // Generate certificate
        const certResult = await certificateGenerator.generateCertificate(
          participant._id,
          event,
          templateType
        );

        if (certResult.success) {
          // Send certificate via email
          const emailResult = await emailService.sendCertificateEmail(
            participant._id,
            certResult.certificatePath,
            event
          );

          if (emailResult.success) {
            // Update certificate record
            certificate.generatedCertificates.push({
              participantId: participant._id,
              certificateUrl: certResult.certificateUrl,
              sentAt: new Date(),
            });

            results.push({
              participantId: participant._id,
              participantName: participant.name,
              success: true,
            });

            console.log(
              `[Certificate Helper] Certificate generated and sent to ${participant.name} (${participant.email})`
            );
          } else {
            results.push({
              participantId: participant._id,
              participantName: participant.name,
              success: false,
              error: "Email sending failed",
            });
          }
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
      `[Certificate Helper] Completed: ${successfulCount}/${results.length} certificates sent successfully for event: ${event.name}`
    );

    return {
      success: true,
      message: `Certificates generated for ${successfulCount} participant(s)`,
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
