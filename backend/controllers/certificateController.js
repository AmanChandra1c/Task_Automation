const Certificate = require("../models/Certificate");
const certificateGenerator = require("../utils/certificateGenerator");
const ActivityLog = require("../models/ActivityLog");
const path = require("path");
const fs = require("fs");

// @desc    Create certificate template
// @route   POST /api/certificates
// @access  Private/Admin
exports.createCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a certificate template",
      });
    }

    const { eventId, namePlaceholder } = req.body;

    const certificate = await Certificate.create({
      eventId: eventId || null,
      templateImage: req.file.path,
      namePlaceholder: namePlaceholder
        ? JSON.parse(namePlaceholder)
        : {
            x: 400,
            y: 300,
            fontSize: 50,
            fontFamily: "Helvetica-Bold",
            color: "#000000",
          },
      createdBy: req.user._id,
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Certificate template created",
      details: { certificateId: certificate._id, eventId },
      status: 201,
    });

    res.status(201).json({
      success: true,
      message: "Certificate template created successfully",
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all certificates
// @route   GET /api/certificates
// @access  Private
exports.getCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate("eventId", "name")
      .populate("createdBy", "name email")
      .populate("generatedCertificates.participantId", "name email")
      .sort({ createdAt: -1 });

    // Convert template paths to URLs
    const certificatesData = certificates.map((certificate) => {
      const certData = certificate.toObject();
      certData.templateImageUrl = `/uploads/certificate-templates/${path.basename(
        certificate.templateImage
      )}`;
      return certData;
    });

    res.status(200).json({
      success: true,
      count: certificatesData.length,
      data: certificatesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single certificate
// @route   GET /api/certificates/:id
// @access  Private
exports.getCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate("eventId", "name")
      .populate("createdBy", "name email")
      .populate("generatedCertificates.participantId", "name email");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Convert template path to URL
    const certificateData = certificate.toObject();
    certificateData.templateImageUrl = `/uploads/certificate-templates/${path.basename(
      certificate.templateImage
    )}`;

    res.status(200).json({
      success: true,
      data: certificateData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update certificate
// @route   PUT /api/certificates/:id
// @access  Private/Admin
exports.updateCertificate = async (req, res) => {
  try {
    const { namePlaceholder } = req.body;

    const updateData = {};
    if (namePlaceholder) {
      updateData.namePlaceholder = JSON.parse(namePlaceholder);
    }

    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Certificate template updated",
      details: { certificateId: req.params.id },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Certificate updated successfully",
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate certificate for single participant
// @route   POST /api/certificates/:id/generate
// @access  Private/Admin
exports.generateCertificate = async (req, res) => {
  try {
    const { participantId } = req.body;

    const certificate = await Certificate.findById(req.params.id).populate(
      "eventId"
    );
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    // Get event information if certificate is linked to an event
    const event = certificate.eventId || null;

    const result = await certificateGenerator.generateCertificate(
      participantId,
      {
        templateImage: certificate.templateImage,
        namePlaceholder: certificate.namePlaceholder,
        eventName: event?.name || "",
        eventDescription: event?.description || "",
      }
    );

    if (result.success) {
      // Update certificate with generated certificate info
      certificate.generatedCertificates.push({
        participantId,
        certificateUrl: result.certificateUrl,
        sentAt: new Date(),
      });
      await certificate.save();

      // Emit socket notification
      const io = req.app.get("io");
      if (io) {
        io.emit("certificateGenerated", {
          message: "Certificate generated successfully",
          participantId,
          certificateUrl: result.certificateUrl,
          userId: req.user._id,
        });
      }

      // Log activity
      await ActivityLog.create({
        userId: req.user._id,
        action: "Certificate generated",
        details: { certificateId: req.params.id, participantId },
        status: 200,
      });

      res.status(200).json({
        success: true,
        message: "Certificate generated successfully",
        data: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate bulk certificates
// @route   POST /api/certificates/:id/generate-bulk
// @access  Private/Admin
exports.generateBulkCertificates = async (req, res) => {
  try {
    const { participantIds } = req.body;

    const certificate = await Certificate.findById(req.params.id).populate(
      "eventId"
    );
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    // Get event information if certificate is linked to an event
    const event = certificate.eventId || null;

    const results = await certificateGenerator.generateBulkCertificates(
      participantIds,
      {
        templateImage: certificate.templateImage,
        namePlaceholder: certificate.namePlaceholder,
        eventName: event?.name || "",
        eventDescription: event?.description || "",
      }
    );

    // Update certificate with generated certificates
    results.forEach((result) => {
      if (result.success) {
        certificate.generatedCertificates.push({
          participantId: result.participantId,
          certificateUrl: result.certificateUrl,
          sentAt: new Date(),
        });
      }
    });
    await certificate.save();

    // Emit socket notification
    const io = req.app.get("io");
    if (io) {
      io.emit("certificatesGenerated", {
        message: `Bulk certificates generated. ${
          results.filter((r) => r.success).length
        } successful.`,
        total: results.length,
        successful: results.filter((r) => r.success).length,
        userId: req.user._id,
      });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Bulk certificates generated",
      details: { certificateId: req.params.id, count: results.length },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: `Bulk certificates generated. ${
        results.filter((r) => r.success).length
      } successful.`,
      total: results.length,
      successful: results.filter((r) => r.success).length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete certificate
// @route   DELETE /api/certificates/:id
// @access  Private/Admin
exports.deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Delete the template image file if it exists
    const fs = require("fs");
    if (certificate.templateImage && fs.existsSync(certificate.templateImage)) {
      try {
        fs.unlinkSync(certificate.templateImage);
      } catch (error) {
        console.error("Error deleting template image:", error);
      }
    }

    // Delete generated certificate files
    if (
      certificate.generatedCertificates &&
      certificate.generatedCertificates.length > 0
    ) {
      certificate.generatedCertificates.forEach((genCert) => {
        if (genCert.certificateUrl) {
          const certPath = path.join(__dirname, "..", genCert.certificateUrl);
          if (fs.existsSync(certPath)) {
            try {
              fs.unlinkSync(certPath);
            } catch (error) {
              console.error("Error deleting generated certificate:", error);
            }
          }
        }
      });
    }

    await Certificate.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Certificate template deleted",
      details: { certificateId: req.params.id },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get default certificate template
// @route   GET /api/certificates/default-template
// @access  Private/Admin
exports.getDefaultTemplate = async (req, res) => {
  try {
    const templateDir = path.join(
      __dirname,
      "../uploads/certificate-templates"
    );
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const templatePath = path.join(templateDir, "default-template.svg");
    const templateUrl = "/uploads/certificate-templates/default-template.svg";

    // Check if template already exists
    if (!fs.existsSync(templatePath)) {
      // Create default template
      const svgTemplate = defaultTemplate.createDefaultTemplateImage();
      fs.writeFileSync(templatePath, svgTemplate);
    }

    res.status(200).json({
      success: true,
      templateUrl: templateUrl,
      message: "Default template available",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create certificate from default template
// @route   POST /api/certificates/default
// @access  Private/Admin
exports.createFromDefaultTemplate = async (req, res) => {
  try {
    const { eventId, namePlaceholder } = req.body;

    const templateDir = path.join(
      __dirname,
      "../uploads/certificate-templates"
    );
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    const defaultTemplatePath = path.join(templateDir, "default-template.svg");

    // If default template doesn't exist, create it
    if (!fs.existsSync(defaultTemplatePath)) {
      const svgTemplate = defaultTemplate.createDefaultTemplateImage();
      fs.writeFileSync(defaultTemplatePath, svgTemplate);
    }

    // Create certificate using default template
    const certificate = await Certificate.create({
      eventId: eventId || null,
      templateImage: defaultTemplatePath,
      namePlaceholder: namePlaceholder
        ? JSON.parse(namePlaceholder)
        : {
            x: 400,
            y: 280,
            fontSize: 48,
            fontFamily: "Helvetica-Bold",
            color: "#2c3e50",
          },
      createdBy: req.user._id,
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Certificate template created from default",
      details: { certificateId: certificate._id, eventId },
      status: 201,
    });

    res.status(201).json({
      success: true,
      message:
        "Certificate template created from default template successfully",
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Preview certificate template
// @route   GET /api/certificates/:id/preview
// @access  Private/Admin
exports.previewCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id).populate(
      "eventId"
    );

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate template not found",
      });
    }

    const event = certificate.eventId;

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found for this certificate",
      });
    }

    // Create a dummy participant object for preview
    const dummyParticipant = {
      _id: "preview",
      name: "Sample Participant Name",
      email: "sample@example.com",
    };

    // Generate preview certificate using simplified generator
    const templateType = certificate.templateType || "sistec";
    let previewResult;
    try {
      previewResult = await certificateGenerator.generateCertificate(
        dummyParticipant,
        event,
        templateType
      );
    } catch (error) {
      console.error("Error generating preview certificate:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate preview certificate",
      });
    }

    if (!previewResult || !previewResult.success) {
      return res.status(500).json({
        success: false,
        message: previewResult?.message || "Failed to generate preview",
      });
    }

    // Read the generated PDF file
    const pdfPath = previewResult.certificatePath;
    if (!pdfPath || !fs.existsSync(pdfPath)) {
      console.error("Preview PDF path not found:", pdfPath);
      return res.status(500).json({
        success: false,
        message: "Preview certificate file not found",
      });
    }

    // Send PDF as response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=certificate-preview.pdf`
    );

    const pdfStream = fs.createReadStream(pdfPath);
    pdfStream.pipe(res);

    // Clean up the preview file after sending
    pdfStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(pdfPath)) {
          try {
            fs.unlinkSync(pdfPath);
          } catch (error) {
            console.error("Error deleting preview file:", error);
          }
        }
      }, 10000); // Delete after 10 seconds
    });

    pdfStream.on("error", (error) => {
      console.error("Error streaming PDF:", error);
      res.status(500).json({
        success: false,
        message: "Error streaming PDF file",
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update certificate template type
// @route   PUT /api/certificates/:id/template
// @access  Private/Admin
exports.updateTemplateType = async (req, res) => {
  try {
    const { templateType } = req.body;

    if (!templateType || !["sistec", "custom"].includes(templateType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid template type. Must be 'sistec' or 'custom'",
      });
    }

    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    certificate.templateType = templateType;
    await certificate.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Certificate template type updated",
      details: { certificateId: certificate._id, templateType },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Certificate template type updated successfully",
      data: certificate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
