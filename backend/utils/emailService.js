const nodemailer = require("nodemailer");
const path = require("path");
const Participant = require("../models/Participant");

const buildTransportOptions = () => {
  const {
    EMAIL_SERVICE,
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_SECURE,
    EMAIL_ALLOW_INVALID_TLS,
  } = process.env;

  const port = EMAIL_PORT ? Number(EMAIL_PORT) : undefined;
  const secureFromEnv =
    typeof EMAIL_SECURE === "string"
      ? EMAIL_SECURE.toLowerCase() === "true"
      : undefined;

  const baseOptions = {
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  };

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn(
      "[Email Service] EMAIL_USER or EMAIL_PASS env vars are missing. Email delivery will fail until they are provided."
    );
  }

  if (
    EMAIL_SERVICE === "gmail" ||
    (!EMAIL_SERVICE && !EMAIL_HOST && EMAIL_USER?.includes("@gmail.com"))
  ) {
    const gmailPort = port || 465;
    const gmailSecure =
      secureFromEnv !== undefined ? secureFromEnv : gmailPort === 465;

    return {
      ...baseOptions,
      service: "gmail",
      port: gmailPort,
      secure: gmailSecure,
    };
  }

  if (!EMAIL_HOST) {
    console.warn(
      "[Email Service] EMAIL_HOST is not defined. Falling back to smtp.gmail.com."
    );
  }

  const resolvedPort = port || 587;
  const resolvedSecure =
    secureFromEnv !== undefined ? secureFromEnv : resolvedPort === 465;

  const transportOptions = {
    ...baseOptions,
    host: EMAIL_HOST || "smtp.gmail.com",
    port: resolvedPort,
    secure: resolvedSecure,
  };

  if (EMAIL_ALLOW_INVALID_TLS?.toLowerCase() === "true") {
    transportOptions.tls = { rejectUnauthorized: false };
  }

  return transportOptions;
};

// Create reusable transporter
const transporter = nodemailer.createTransport(buildTransportOptions());

transporter
  .verify()
  .then(() => {
    console.log("[Email Service] Transporter configuration verified.");
  })
  .catch((error) => {
    console.error(
      "[Email Service] Transporter verification failed. Email delivery will not work until this is resolved:",
      error.message
    );
  });

// Replace placeholders in template
const replacePlaceholders = (template, participant) => {
  let content = template;

  // Replace standard placeholders
  content = content.replace(/\{\{name\}\}/g, participant.name || "");
  content = content.replace(/\{\{email\}\}/g, participant.email || "");
  content = content.replace(/\{\{semester\}\}/g, participant.semester || "");

  // Replace custom fields
  if (participant.customFields) {
    Object.keys(participant.customFields).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      content = content.replace(regex, participant.customFields[key] || "");
    });
  }

  return content;
};

// Send email to single participant
exports.sendEmail = async (
  participantId,
  template,
  eventName = "",
  attachments = []
) => {
  try {
    const participant = await Participant.findById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    let subject = replacePlaceholders(template.subject, participant);
    let body = replacePlaceholders(template.body, participant);

    // Replace event name if provided
    if (eventName) {
      subject = subject.replace(/\{\{event_name\}\}/g, eventName);
      body = body.replace(/\{\{event_name\}\}/g, eventName);
    }

    const mailOptions = {
      from: `"Task Automation System" <${process.env.EMAIL_USER}>`,
      to: participant.email,
      subject: subject,
      html: body,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);

    // Update participant
    participant.emailSent = true;
    participant.emailSentAt = new Date();
    await participant.save();

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error(
      `[Email Service] Failed to send email to participant ${participantId}:`,
      error
    );
    return { success: false, message: error.message };
  }
};

// Send bulk emails
exports.sendBulkEmails = async (
  participantIds,
  template,
  eventName = "",
  attachments = []
) => {
  const results = [];

  for (const participantId of participantIds) {
    const result = await exports.sendEmail(
      participantId,
      template,
      eventName,
      attachments
    );
    results.push({ participantId, ...result });
  }

  return results;
};

// Send certificate email
exports.sendCertificateEmail = async (
  participantId,
  certificatePath,
  event
) => {
  try {
    const participant = await Participant.findById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const eventName = event?.name || "Event";
    const subject = `Your Certificate for ${eventName}`;
    const body = `
      <html>
        <body>
          <h2>Congratulations ${participant.name}!</h2>
          <p>Thank you for participating in <strong>${eventName}</strong>.</p>
          ${event?.description ? `<p>${event.description}</p>` : ""}
          <p>Please find your certificate attached to this email.</p>
          <p>Best regards,<br>Task Automation System</p>
        </body>
      </html>
    `;

    const absoluteCertificatePath = path.isAbsolute(certificatePath)
      ? certificatePath
      : path.join(process.cwd(), certificatePath);

    const mailOptions = {
      from: `"Task Automation System" <${process.env.EMAIL_USER}>`,
      to: participant.email,
      subject: subject,
      html: body,
      attachments: [
        {
          filename: `Certificate_${participant.name.replace(/\s+/g, "_")}.pdf`,
          path: absoluteCertificatePath,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // Update participant
    participant.certificateSent = true;
    participant.certificateSentAt = new Date();
    await participant.save();

    return { success: true, message: "Certificate email sent successfully" };
  } catch (error) {
    console.error(
      `[Email Service] Failed to send certificate email to participant ${participantId}:`,
      error
    );
    return { success: false, message: error.message };
  }
};

// Send event notification to participants (all or subset)
exports.sendEventNotificationToAll = async (event, participantIds = null) => {
  try {
    const participantQuery = {
      email: { $exists: true, $ne: "" },
    };

    if (Array.isArray(participantIds) && participantIds.length > 0) {
      participantQuery._id = { $in: participantIds };
    }

    // Get participants
    const participants = await Participant.find(participantQuery);

    if (participants.length === 0) {
      return {
        success: true,
        message: "No participants found to notify",
        sent: 0,
      };
    }

    // Format event date
    const eventDate = new Date(event.date);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = eventDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const eventName = event.name || "Event";
    const eventDescription = event.description || "";

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Send emails to all participants
    for (const participant of participants) {
      try {
        const subject = `Upcoming Event: ${eventName}`;
        const body = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50;">Upcoming Event Notification</h2>
                <p>Dear ${participant.name || "Participant"},</p>
                <p>We are excited to inform you about an upcoming event:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #2196F3;">${eventName}</h3>
                  ${
                    eventDescription
                      ? `<p style="margin: 10px 0;">${eventDescription}</p>`
                      : ""
                  }
                  <p style="margin: 10px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 10px 0;"><strong>Time:</strong> ${formattedTime}</p>
                </div>
                <p>We look forward to your participation!</p>
                <p>Best regards,<br>Task Automation System</p>
              </div>
            </body>
          </html>
        `;

        const mailOptions = {
          from: `"Task Automation System" <${process.env.EMAIL_USER}>`,
          to: participant.email,
          subject: subject,
          html: body,
        };

        await transporter.sendMail(mailOptions);
        successCount++;
      } catch (error) {
        failCount++;
        errors.push({
          participantId: participant._id,
          email: participant.email,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Event notification sent to ${successCount} participants`,
      sent: successCount,
      failed: failCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error(
      "[Email Service] Failed to send event notification emails:",
      error
    );
    return { success: false, message: error.message };
  }
};

// Verify email configuration
exports.verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    return { success: true, message: "Email configuration is valid" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
