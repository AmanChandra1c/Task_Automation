// emailService.js

const Brevo = require("@getbrevo/brevo");
const { TransactionalEmailsApi, SendSmtpEmail } = Brevo;
const participantModel = require("../models/Participant");

// initialize Brevo client
const client = new TransactionalEmailsApi();
client.authentications.apiKey.apiKey = process.env.BREVO_API_KEY;

// Helper to replace placeholders in template (unchanged)
const replacePlaceholders = (template, participant) => {
  let content = template;

  content = content.replace(/\{\{name\}\}/g, participant.name || "");
  content = content.replace(/\{\{email\}\}/g, participant.email || "");
  content = content.replace(/\{\{semester\}\}/g, participant.semester || "");

  if (participant.customFields) {
    Object.keys(participant.customFields).forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      content = content.replace(regex, participant.customFields[key] || "");
    });
  }

  return content;
};

// Send email to single participant via Brevo
exports.sendEmail = async (
  participantId,
  template,
  eventName = "",
  attachments = []
) => {
  try {
    const participant = await participantModel.findById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    let subject = replacePlaceholders(template.subject, participant);
    let bodyHtml = replacePlaceholders(template.body, participant);

    if (eventName) {
      subject = subject.replace(/\{\{event_name\}\}/g, eventName);
      bodyHtml = bodyHtml.replace(/\{\{event_name\}\}/g, eventName);
    }

    // Build the message object for Brevo
    const message = new SendSmtpEmail();
    message.sender = {
      name: "Task Automation System",
      email: process.env.EMAIL_USER, // or a verified sender
    };
    message.to = [
      {
        email: participant.email,
        name: participant.name || undefined,
      },
    ];
    message.subject = subject;
    message.htmlContent = bodyHtml;

    // If you want to send attachments, Brevo supports attachments as base64 encoded
    if (attachments && attachments.length > 0) {
      message.attachment = attachments.map((att) => ({
        // Brevo expects base64 encoded content and filename
        content: att.contentBase64, // you’ll need to read file and convert to base64
        name: att.filename,
        type: att.contentType, // e.g., 'application/pdf'
      }));
    }

    // Send the email via Brevo
    await client.sendTransacEmail(message);

    // Update participant
    participant.emailSent = true;
    participant.emailSentAt = new Date();
    await participant.save();

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
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
    const participant = await participantModel.findById(participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const eventName = event?.name || "Event";
    const subject = `Your Certificate for ${eventName}`;
    const bodyHtml = `
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

    const message = new SendSmtpEmail();
    message.sender = {
      name: "Task Automation System",
      email: process.env.EMAIL_USER,
    };
    message.to = [
      {
        email: participant.email,
        name: participant.name || undefined,
      },
    ];
    message.subject = subject;
    message.htmlContent = bodyHtml;

    // Read certificate file and encode base64
    const fs = require("fs");
    const path = require("path");
    const fileContent = fs.readFileSync(path.resolve(certificatePath));
    const base64Content = fileContent.toString("base64");

    message.attachment = [
      {
        content: base64Content,
        name: `Certificate_${participant.name.replace(/\s+/g, "_")}.pdf`,
        type: "application/pdf",
      },
    ];

    await client.sendTransacEmail(message);

    participant.certificateSent = true;
    participant.certificateSentAt = new Date();
    await participant.save();

    return { success: true, message: "Certificate email sent successfully" };
  } catch (error) {
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

    const participants = await participantModel.find(participantQuery);
    if (participants.length === 0) {
      return {
        success: true,
        message: "No participants found to notify",
        sent: 0,
      };
    }

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

    for (const participant of participants) {
      try {
        const subject = `Upcoming Event: ${eventName}`;
        const bodyHtml = `
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

        const message = new SendSmtpEmail();
        message.sender = {
          name: "Task Automation System",
          email: process.env.EMAIL_USER,
        };
        message.to = [
          {
            email: participant.email,
            name: participant.name || undefined,
          },
        ];
        message.subject = subject;
        message.htmlContent = bodyHtml;

        await client.sendTransacEmail(message);
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
      errors: errors.length ? errors : undefined,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Verify configuration (simple check)
exports.verifyEmailConfig = async () => {
  try {
    // For Brevo, you could try a lightweight send or check account; the SDK has no direct verify method
    // One simple approach: send a test email to your own address or to a dummy address
    // Here we'll just check that API key is present
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }
    return { success: true, message: "Email configuration appears valid" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
