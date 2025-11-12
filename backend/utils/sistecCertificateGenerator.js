const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Participant = require("../models/Participant");

const formatEventDate = (date) => {
  if (!date) return "";
  if (Array.isArray(date) && date.length === 2) {
    const d1 = new Date(date[0]);
    const d2 = new Date(date[1]);
    const day1 = d1.getDate();
    const day2 = d2.getDate();
    const month = d2.toLocaleDateString("en-US", { month: "short" });
    const year = d2.getFullYear();

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
    return `${getOrdinal(day1)} and ${getOrdinal(day2)} ${month} ${year}`;
  }

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

exports.generateSISTecCertificate = async (participantIdOrObject, event) => {
  try {
    let participant;
    if (
      typeof participantIdOrObject === "object" &&
      participantIdOrObject.name
    ) {
      participant = participantIdOrObject;
    } else {
      participant = await Participant.findById(participantIdOrObject);
      if (!participant) throw new Error("Participant not found");
    }

    const certDir = path.join(__dirname, "../uploads/certificates");
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

    const isPreview =
      typeof participantIdOrObject === "object" &&
      participantIdOrObject._id === "preview";
    const fileName = isPreview
      ? `preview_${Date.now()}.pdf`
      : `certificate_${participantIdOrObject}_${Date.now()}.pdf`;
    const outputPath = path.join(certDir, fileName);

    // A4 landscape
    const doc = new PDFDocument({
      size: [842, 595],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });
    doc.pipe(fs.createWriteStream(outputPath));

    // Background plain white
    // Background plain white
    doc.rect(0, 0, 842, 595).fill("#FFFFFF");

    // Optional border frame
    doc.lineWidth(2).strokeColor("#1e4d72").rect(20, 20, 802, 555).stroke();

    // Title
    doc
      .fontSize(52)
      .font("Helvetica-Bold")
      .fillColor("#1e4d72")
      .text("CERTIFICATE", 0, 80, { align: "center" });
    doc
      .fontSize(24)
      .font("Helvetica")
      .fillColor("#1e4d72")
      .text("Of Participation", 0, 140, { align: "center" });

    // Intro line
    doc
      .fontSize(16)
      .font("Helvetica")
      .fillColor("#666666")
      .text("This Certificate is Proudly Presented to", 0, 190, {
        align: "center",
      });

    // Participant name
    const participantName = `Mr./Ms. ${participant.name}`;
    doc
      .fontSize(34)
      .font("Helvetica-Bold")
      .fillColor("#000000")
      .text(participantName, 0, 230, { align: "center" });

    // Event paragraph (larger text, centered)
    const eventName = event?.name || "AI Patrol Contest";
    const eventFest =
      event?.fest ||
      "The National Level Technical-Cultural Fest “Sagar Fiesta 2024”";
    const institute =
      "Sagar Institute of Science & Technology (SISTec), Gandhi Nagar, Bhopal";
    const effortPhrase = "with his/her high terrific efforts shared.";

    const paragraph =
      `In recognition of his/her active participation in the event ${eventName} ` +
      `at ${eventFest}, organized by ${institute}. ${effortPhrase}`;

    doc
      .fontSize(18) // bigger paragraph text
      .font("Helvetica")
      .fillColor("#000000")
      .text(paragraph, 60, 300, {
        align: "center",
        width: 720,
        lineGap: 8,
      });

    // Signatures (centered at bottom)
    const baselineY = 470;
    const lineY = baselineY - 8;
    const nameY = baselineY + 6;
    const roleY = nameY + 14;

    // Left signature
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(120, lineY)
      .lineTo(300, lineY)
      .stroke();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Dr. D.R. BANGORIA", 120, nameY, { width: 180, align: "center" });
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("(Principal)", 120, roleY, { width: 180, align: "center" });

    // Middle signature
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(331, lineY)
      .lineTo(511, lineY)
      .stroke();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("DR. SNEHA SAXENA", 331, nameY, { width: 180, align: "center" });
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("(CEO, Sagar Group of Institutions)", 331, roleY, {
        width: 180,
        align: "center",
      });

    // Right signature
    doc
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(572, lineY)
      .lineTo(752, lineY)
      .stroke();
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("MR. NAROO CHAUHAN", 572, nameY, { width: 180, align: "center" });
    doc
      .fontSize(9)
      .font("Helvetica")
      .text("(Chairperson, Event Committee)", 572, roleY, {
        width: 180,
        align: "center",
      });

    // Footer committee label
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Sistec Team (Event Organizing Committee)", 0, roleY + 38, {
        align: "center",
      });

    doc.end();

    await new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
    });

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
    return { success: false, message: error.message };
  }
};
