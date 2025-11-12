const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Participant = require("../models/Participant");

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format date like "12th Jan 2025" or "03rd and 04th April 2025"
 */
const formatEventDate = (date) => {
  if (!date) return "";

  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();

  const getOrdinal = (n) => {
    if (n > 3 && n < 21) return n + "th";
    switch (n % 10) {
      case 1:
        return n + "st";
      case 2:
        return n + "nd";
      case 3:
        return n + "rd";
      default:
        return n + "th";
    }
  };

  return `${getOrdinal(day)} ${month} ${year}`;
};

/**
 * Get participant object (real or dummy for preview)
 */
const getParticipant = async (participantIdOrObject) => {
  if (typeof participantIdOrObject === "object" && participantIdOrObject.name) {
    return participantIdOrObject;
  }
  const participant = await Participant.findById(participantIdOrObject);
  if (!participant) {
    throw new Error("Participant not found");
  }
  return participant;
};

// ============================================
// SISTEC TEMPLATE GENERATOR
// ============================================

/**
 * Generate SISTec-style certificate PDF
 */
const generateSISTecTemplate = async (doc, participant, event) => {
  const eventName = event?.name || "Event";
  const eventDate = event?.date ? formatEventDate(event.date) : "";
  const eventDescription =
    event?.description ||
    'The National "Level Techno-Cultural Fest 17th Sagar Fiesta 2024 Vriddhi: Vintage to Vogue"';

  // Background
  doc.rect(0, 0, 842, 899).fill("#FFFFFF");

  // Left geometric shapes
  doc.fillColor("#1e4d72").moveTo(0, 0).lineTo(180, 0).lineTo(0, 180).fill();
  doc
    .fillColor("#4a90a4")
    .moveTo(0, 415)
    .lineTo(220, 595)
    .lineTo(0, 595)
    .fill();

  // Right geometric shapes
  doc
    .fillColor("#E8E8E8")
    .strokeColor("#1e4d72")
    .lineWidth(1.5)
    .moveTo(680, 40)
    .lineTo(730, 20)
    .lineTo(780, 40)
    .lineTo(780, 90)
    .lineTo(730, 110)
    .lineTo(680, 90)
    .closePath()
    .fillAndStroke();

  doc
    .fillColor("#E8E8E8")
    .strokeColor("#1e4d72")
    .lineWidth(1.5)
    .moveTo(700, 200)
    .lineTo(750, 180)
    .lineTo(800, 200)
    .lineTo(800, 250)
    .lineTo(750, 270)
    .lineTo(700, 250)
    .closePath()
    .fillAndStroke();

  doc
    .fillColor("#1e4d72")
    .moveTo(720, 450)
    .lineTo(770, 430)
    .lineTo(820, 450)
    .lineTo(820, 500)
    .lineTo(770, 520)
    .lineTo(720, 500)
    .closePath()
    .fill();

  // SISTec Logo
  doc
    .fontSize(50)
    .font("Helvetica-Bold")
    .fillColor("#1e4d72")
    .text("S", 50, 20);
  doc
    .fillColor("#1e4d72")
    .moveTo(75, 40)
    .lineTo(85, 50)
    .lineTo(75, 50)
    .closePath()
    .fill();
  doc.fontSize(28).text("ISTec", 90, 25);

  // Location bar
  doc.fillColor("#1e4d72").rect(50, 55, 180, 12).fill();
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#FFFFFF")
    .text("GANDHI NAGAR, BHOPAL", 50, 57, { width: 180 });
  doc
    .fontSize(7)
    .font("Helvetica")
    .fillColor("#000000")
    .text("ENGINEERING | MANAGEMENT | PHARMACY", 50, 72, { width: 200 });

  // Top right logos
  doc.fillColor("#FF6B6B").fontSize(10).text("★", 650, 20);
  doc
    .fontSize(6)
    .font("Helvetica-Bold")
    .fillColor("#666666")
    .text("VRIDDHI", 665, 22, { width: 80 });
  doc.fillColor("#1e4d72").fontSize(8).text("S", 650, 38);
  doc
    .fontSize(6)
    .font("Helvetica-Bold")
    .fillColor("#666666")
    .text("SAGAR FIESTA", 660, 40, { width: 80 });
  doc.fillColor("#FFD700").rect(650, 56, 90, 8).fill();
  doc
    .fontSize(5)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("SOFT-TECH GLOBAL", 650, 57, { width: 90 });

  // Title
  doc
    .fontSize(48)
    .font("Helvetica-Bold")
    .fillColor("#1e4d72")
    .text("CERTIFICATE", 421, 110, { align: "center", width: 400 });
  doc
    .fontSize(18)
    .font("Helvetica")
    .fillColor("#1e4d72")
    .text("Of Participation", 421, 160, { align: "center", width: 400 });

  // Introductory text
  doc
    .fontSize(13)
    .font("Helvetica")
    .fillColor("#666666")
    .text("This Certificate is Proudly Presented to", 421, 198, {
      align: "center",
      width: 400,
    });

  // Participant name
  doc
    .fontSize(28)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text(`Mr./Ms. ${participant.name}`, 421, 230, {
      align: "center",
      width: 400,
    });

  // Background rectangle
  doc.fillColor("#F5F5F5").rect(100, 255, 642, 100).fill();

  // Participation text
  const participationText = `in recognition for his/her active participation in the event ${eventName} at ${eventDescription} organized on ${eventDate} at Sagar Institute of Science & Technology (SISTec), Gandhi-Nagar, Bhopal. We wish him/her a bright future ahead.`;
  doc
    .fontSize(10.5)
    .font("Helvetica")
    .fillColor("#000000")
    .text(participationText, 421, 270, {
      align: "center",
      width: 400,
      lineGap: 4,
    });

  // Signatures
  const signatureY = 475;
  const signatureLineY = signatureY - 5;
  const nameY = signatureY + 10;
  const roleY = nameY + 12;

  doc
    .strokeColor("#000000")
    .lineWidth(1)
    .moveTo(100, signatureLineY)
    .lineTo(250, signatureLineY)
    .stroke();
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("DR. D.K RAJORIYA", 100, nameY, { width: 150, align: "center" });
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#000000")
    .text("(PRINCIPAL)", 100, roleY, { width: 150, align: "center" });

  doc
    .strokeColor("#000000")
    .lineWidth(1)
    .moveTo(321, signatureLineY)
    .lineTo(471, signatureLineY)
    .stroke();
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("DR. SWATI SAXENA", 321, nameY, { width: 150, align: "center" });
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#000000")
    .text("(VICE PRINCIPAL)", 321, roleY, { width: 150, align: "center" });

  doc
    .strokeColor("#000000")
    .lineWidth(1)
    .moveTo(542, signatureLineY)
    .lineTo(692, signatureLineY)
    .stroke();
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("MR. NARGISH GUPTA", 542, nameY, { width: 150, align: "center" });
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#000000")
    .text("(SAGAR FIESTA COORDINATOR)", 542, roleY, {
      width: 150,
      align: "center",
    });

  // Sponsor info
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#000000")
    .text("Sponsored by", 321, roleY + 15, { width: 150, align: "center" });
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("Soft-Tech Global Computer Institute", 321, roleY + 25, {
      width: 150,
      align: "center",
    });
};

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

/**
 * Generate certificate PDF
 * @param {String|Object} participantIdOrObject - Participant ID or object (for preview)
 * @param {Object} event - Event object
 * @param {String} templateType - Template type: "sistec" or "custom"
 */
exports.generateCertificate = async (
  participantIdOrObject,
  event,
  templateType = "sistec"
) => {
  try {
    const participant = await getParticipant(participantIdOrObject);
    const isPreview =
      typeof participantIdOrObject === "object" &&
      participantIdOrObject._id === "preview";

    // Create certificates directory
    const certDir = path.join(__dirname, "../uploads/certificates");
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    // Generate filename
    const fileName = isPreview
      ? `preview_${Date.now()}.pdf`
      : `certificate_${participantIdOrObject}_${Date.now()}.pdf`;
    const outputPath = path.join(certDir, fileName);

    // Create PDF
    const doc = new PDFDocument({
      size: [842, 595], // A4 landscape
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    doc.pipe(fs.createWriteStream(outputPath));

    // Generate based on template type
    if (templateType === "sistec") {
      await generateSISTecTemplate(doc, participant, event);
    } else {
      throw new Error(`Template type "${templateType}" not supported`);
    }

    doc.end();

    // Wait for PDF generation
    await new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
    });

    // Update participant (only for real participants, not preview)
    if (participant._id && participant._id !== "preview" && participant.save) {
      participant.certificateSent = true;
      participant.certificateSentAt = new Date();
      await participant.save();
    }

    return {
      success: true,
      certificatePath: outputPath,
      certificateUrl: `/uploads/certificates/${path.basename(outputPath)}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

/**
 * Generate bulk certificates
 */
exports.generateBulkCertificates = async (
  participantIds,
  event,
  templateType = "sistec"
) => {
  const results = [];
  for (const participantId of participantIds) {
    const result = await exports.generateCertificate(
      participantId,
      event,
      templateType
    );
    results.push({ participantId, ...result });
  }
  return results;
};
