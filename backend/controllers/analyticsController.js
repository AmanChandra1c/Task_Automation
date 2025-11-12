const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const Participant = require("../models/Participant");
const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const fs = require("fs");
const path = require("path");

// @desc    Export emails report
// @route   GET /api/analytics/export/emails
// @access  Private/Admin
exports.exportEmailsReport = async (req, res) => {
  try {
    const { format = "excel" } = req.query;
    const participants = await Participant.find({ emailSent: true })
      .populate("eventId", "name")
      .sort({ emailSentAt: -1 });

    if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=emails-report.pdf"
      );
      doc.pipe(res);

      doc.fontSize(20).text("Emails Sent Report", { align: "center" });
      doc.moveDown();

      participants.forEach((participant, index) => {
        doc
          .fontSize(12)
          .text(`${index + 1}. ${participant.name} (${participant.email})`, {
            align: "left",
          })
          .text(`   Event: ${participant.eventId?.name || "N/A"}`)
          .text(
            `   Sent At: ${participant.emailSentAt?.toLocaleString() || "N/A"}`
          )
          .moveDown();
      });

      doc.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Emails Sent");

      worksheet.columns = [
        { header: "Name", key: "name", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Semester", key: "semester", width: 15 },
        { header: "Event", key: "event", width: 30 },
        { header: "Sent At", key: "sentAt", width: 25 },
      ];

      participants.forEach((participant) => {
        worksheet.addRow({
          name: participant.name,
          email: participant.email,
          semester: participant.semester,
          event: participant.eventId?.name || "N/A",
          sentAt: participant.emailSentAt?.toLocaleString() || "N/A",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=emails-report.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export certificates report
// @route   GET /api/analytics/export/certificates
// @access  Private/Admin
exports.exportCertificatesReport = async (req, res) => {
  try {
    const { format = "excel" } = req.query;
    const participants = await Participant.find({ certificateSent: true })
      .populate("eventId", "name")
      .sort({ certificateSentAt: -1 });

    if (format === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=certificates-report.pdf"
      );
      doc.pipe(res);

      doc.fontSize(20).text("Certificates Sent Report", { align: "center" });
      doc.moveDown();

      participants.forEach((participant, index) => {
        doc
          .fontSize(12)
          .text(`${index + 1}. ${participant.name} (${participant.email})`, {
            align: "left",
          })
          .text(`   Event: ${participant.eventId?.name || "N/A"}`)
          .text(
            `   Sent At: ${
              participant.certificateSentAt?.toLocaleString() || "N/A"
            }`
          )
          .moveDown();
      });

      doc.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Certificates Sent");

      worksheet.columns = [
        { header: "Name", key: "name", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Semester", key: "semester", width: 15 },
        { header: "Event", key: "event", width: 30 },
        { header: "Sent At", key: "sentAt", width: 25 },
      ];

      participants.forEach((participant) => {
        worksheet.addRow({
          name: participant.name,
          email: participant.email,
          semester: participant.semester,
          event: participant.eventId?.name || "N/A",
          sentAt: participant.certificateSentAt?.toLocaleString() || "N/A",
        });
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=certificates-report.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export event summary
// @route   GET /api/analytics/export/event/:id
// @access  Private/Admin
exports.exportEventSummary = async (req, res) => {
  try {
    const { format = "excel" } = req.query;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Get all participants for this event from Participant model
    const participants = await Participant.find({ eventId: event._id }).sort({
      name: 1,
    });

    const participantCount = participants.length;

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=event-${event.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}-summary.pdf`
      );
      doc.pipe(res);

      // Header
      doc.fontSize(24).text(event.name, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).text(
        `Date: ${new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "center" }
      );
      doc.moveDown(0.5);
      doc.fontSize(12).text(
        `Time: ${new Date(event.date).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        { align: "center" }
      );
      doc.moveDown();

      // Description
      if (event.description) {
        doc.fontSize(12).text("Description:", { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(11).text(event.description);
        doc.moveDown();
      }

      // Participant count
      doc.fontSize(16).text(`Total Participants: ${participantCount}`, {
        underline: true,
      });
      doc.moveDown();

      // Participants table header
      let yPos = doc.y;
      doc
        .fontSize(10)
        .text("No.", 50, yPos)
        .text("Name", 80, yPos)
        .text("Email", 200, yPos)
        .text("Semester", 350, yPos)
        .text("Certificate Sent", 420, yPos);

      doc
        .moveTo(50, yPos + 15)
        .lineTo(550, yPos + 15)
        .stroke();
      doc.moveDown(0.5);

      // Participants list
      participants.forEach((participant, index) => {
        const currentY = doc.y;

        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          yPos = doc.y;
          doc
            .fontSize(10)
            .text("No.", 50, yPos)
            .text("Name", 80, yPos)
            .text("Email", 200, yPos)
            .text("Semester", 350, yPos)
            .text("Certificate Sent", 420, yPos);
          doc
            .moveTo(50, yPos + 15)
            .lineTo(550, yPos + 15)
            .stroke();
          doc.moveDown(0.5);
        }

        doc
          .fontSize(10)
          .text(`${index + 1}.`, 50, doc.y)
          .text(participant.name || "N/A", 80, doc.y, { width: 110 })
          .text(participant.email || "N/A", 200, doc.y, { width: 140 })
          .text(participant.semester || "N/A", 350, doc.y, { width: 60 })
          .text(participant.certificateSent ? "Yes" : "No", 420, doc.y);
        doc.moveDown(0.8);
      });

      doc.end();
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Event Summary");

      // Event Information Section
      const eventInfoRow = worksheet.addRow(["Event Information"]);
      eventInfoRow.font = { bold: true, size: 14 };
      eventInfoRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      eventInfoRow.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };

      worksheet.addRow(["Event Name:", event.name]);
      worksheet.addRow([
        "Event Date:",
        new Date(event.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      ]);
      worksheet.addRow([
        "Event Time:",
        new Date(event.date).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ]);
      if (event.description) {
        worksheet.addRow(["Description:", event.description]);
      }
      worksheet.addRow(["Total Participants:", participantCount]);
      worksheet.addRow([]); // Empty row

      // Set column widths and keys (this will create the header row)
      worksheet.columns = [
        { header: "No.", key: "no", width: 8 },
        { header: "Participant Name", key: "name", width: 30 },
        { header: "Email", key: "email", width: 35 },
        { header: "Semester", key: "semester", width: 15 },
        { header: "Certificate Sent", key: "certificateSent", width: 20 },
      ];

      // Style the participants header row
      const eventInfoRows = event.description ? 6 : 5; // Count of event info rows
      const headerRowNum = eventInfoRows + 2; // +1 for empty row, +1 for header row
      const headerRow = worksheet.getRow(headerRowNum);
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E1F2" },
      };
      headerRow.font = { bold: true };
      headerRow.height = 20;
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      // Add participants
      participants.forEach((participant, index) => {
        worksheet.addRow({
          no: index + 1,
          name: participant.name || "N/A",
          email: participant.email || "N/A",
          semester: participant.semester || "N/A",
          certificateSent: participant.certificateSent ? "Yes" : "No",
        });
      });

      // Style the event info header row
      worksheet.getRow(1).height = 25;

      // Add borders to header row (already styled above, just add borders)
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Add borders to participant rows
      const startRow = headerRowNum + 1;
      const endRow = headerRowNum + participants.length;
      for (let i = startRow; i <= endRow; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=event-${event.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}-summary.xlsx`
      );
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
