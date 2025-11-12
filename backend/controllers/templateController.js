const EmailTemplate = require("../models/EmailTemplate");
const ActivityLog = require("../models/ActivityLog");

// @desc    Create email template
// @route   POST /api/templates
// @access  Private/Admin
exports.createTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;

    // Extract placeholders from body
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const placeholders = [];
    let match;
    while ((match = placeholderRegex.exec(body)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }
    while ((match = placeholderRegex.exec(subject)) !== null) {
      if (!placeholders.includes(match[1])) {
        placeholders.push(match[1]);
      }
    }

    const template = await EmailTemplate.create({
      name,
      subject,
      body,
      placeholders,
      createdBy: req.user._id,
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Email template created",
      details: { templateId: template._id, name },
      status: 201,
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all templates
// @route   GET /api/templates
// @access  Private
exports.getTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single template
// @route   GET /api/templates/:id
// @access  Private
exports.getTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update template
// @route   PUT /api/templates/:id
// @access  Private/Admin
exports.updateTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;

    // Extract placeholders if body is updated
    let placeholders = [];
    if (body || subject) {
      const template = await EmailTemplate.findById(req.params.id);
      const content = body || template.body;
      const subj = subject || template.subject;

      const placeholderRegex = /\{\{(\w+)\}\}/g;
      let match;
      while ((match = placeholderRegex.exec(content)) !== null) {
        if (!placeholders.includes(match[1])) {
          placeholders.push(match[1]);
        }
      }
      while ((match = placeholderRegex.exec(subj)) !== null) {
        if (!placeholders.includes(match[1])) {
          placeholders.push(match[1]);
        }
      }
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    if (placeholders.length > 0) {
      updateData.placeholders = placeholders;
    }

    const template = await EmailTemplate.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Email template updated",
      details: { templateId: template._id, name: template.name },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: template,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private/Admin
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    await template.deleteOne();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Email template deleted",
      details: { templateId: req.params.id, name: template.name },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
